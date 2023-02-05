#!/usr/bin/env python3
"""Demonstrate task submission via py-tes."""

import logging
import os
from pathlib import Path
import requests
import sys
from time import sleep
from typing import Dict, Optional

import tes

LOGGER = logging.getLogger(__name__)
logging.getLogger("tes").setLevel(logging.WARNING) 


def main() -> None:
    # set up logging
    logging.basicConfig(
        level=logging.INFO,
        format= '[%(asctime)s] %(levelname)s - %(message)s',
        datefmt='%H:%M:%S'
    )

    # import TES instances
    _file=Path(".tes_instances")
    LOGGER.info(f"Importing TES instances from file {str(_file)}")
    try:
        TES_INSTANCES = bash_assoc_array_from_file(_file=".tes_instances")
    except FileNotFoundError:
        LOGGER.critical(f"No TES instances defined. Aborting.")
        sys.exit(1)

    # list TES instances
    LOGGER.info(f"Available TES instances:")
    for idx, (key, url) in enumerate(TES_INSTANCES.items()):
        LOGGER.info(f"({idx + 1}) {key}: {url}")

    # set task payload
    LOGGER.info(f"Setting task payload...")
    task=tes.Task(
        executors=[
            tes.Executor(
                image="alpine",
                command=["echo", "hello"]
            )
        ]
    )

    # submit tasks
    task_ids: Dict[str, str] = {}
    for key, url in TES_INSTANCES.items():
        LOGGER.info(f"Submitting task to {key} ({url})...")
        try:
            task_id = submit_task(task=task, url=url)
        except requests.exceptions.HTTPError as exc:
            LOGGER.warning(f"FAILED: {exc}")
            continue
        task_ids[task_id] = url
        LOGGER.info(f"Task ID: {task_id}")

    # check task states periodically until all tasks finished
    task_states: Dict = dict.fromkeys(task_ids, "UNKNOWN")
    FINAL_STATES = ["COMPLETE", "EXECUTOR_ERROR", "SYSTEM_ERROR", "CANCELLED"]
    sleep_time=5
    while not all(state in FINAL_STATES for _, state in task_states.items()):
        LOGGER.info(f"Waiting for {sleep_time} seconds...")
        sleep(sleep_time)
        LOGGER.info(f"Checking states of all tasks...")
        for task_id, url in task_ids.items():
            LOGGER.info(f"Checking state of task '{task_id}' ({url})...")
            task_state = get_task_state(task_id=task_id, url=url)
            task_states[task_id] = task_state
            LOGGER.info(f"Task state: {task_state}")
    LOGGER.info(f"All tasks concluded.")


def bash_assoc_array_from_file(_file: str, sep="\0") -> Dict:
    """Get Bash associative array contents from file.

    Args:
        _file: Path to file with associative array contents.
        sep: String used to separate records when exporting associative array.

    Returns:
        Bash associative array contents as dictionary.
    """
    _dict: Dict = {}
    fragments = open('.tes_instances', 'r').read().split(sep)
    while len(fragments) >= 2:
        key = fragments.pop(0)
        val = fragments.pop(0);
        _dict[key] = val
    return _dict


def submit_task(
    task: tes.Task,
    url: str,
    timeout: int = 5,
    user: Optional[str] = os.environ.get('FUNNEL_SERVER_USER'),
    password: Optional[str] = os.environ.get('FUNNEL_SERVER_PASSWORD'),
) -> str:
    """Submit task to TES instance.

    Args:
        task: Task to submit.
        url: TES instance URL.
        timeout: Timeout in seconds.
        user: Username for authentication.
        password: Password for authentication.

    Returns:
        Identifier of submitted task.
    """
    cli = tes.HTTPClient(url, timeout=timeout, user=user, password=password)
    return cli.create_task(task=task)


def get_task_state(
    task_id: str,
    url: str,
    timeout: int = 5,
    user: Optional[str] = os.environ.get('FUNNEL_SERVER_USER'),
    password: Optional[str] = os.environ.get('FUNNEL_SERVER_PASSWORD'),
) -> str:
    """Check state of task.

    Args:
        task_id: Identifier of task.
        url: TES instance URL.
        timeout: Timeout in seconds.
        user: Username for authentication.
        password: Password for authentication.

    Returns:
        State of task.
    """
    cli = tes.HTTPClient(url, timeout=timeout, user=user, password=password)
    return cli.get_task(task_id=task_id).state


if __name__ == '__main__':
    main()
