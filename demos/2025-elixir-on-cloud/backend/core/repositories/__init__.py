"""
Repository Layer - Framework-agnostic data access
"""

import json
import os
from abc import ABC, abstractmethod
from typing import List, Optional, Dict, Any
from pathlib import Path

from ..models import WorkflowRun, TESInstance


class WorkflowRepository(ABC):
    """Abstract repository for workflow data persistence"""
    
    @abstractmethod
    def save_workflow_run(self, workflow_run: WorkflowRun) -> None:
        pass
    
    @abstractmethod
    def get_workflow_run(self, run_id: str) -> Optional[WorkflowRun]:
        pass
    
    @abstractmethod
    def get_all_workflow_runs(self) -> List[WorkflowRun]:
        pass
    
    @abstractmethod
    def update_workflow_status(self, run_id: str, status: str) -> bool:
        pass
    
    @abstractmethod
    def delete_workflow_run(self, run_id: str) -> bool:
        pass


class TESInstanceRepository(ABC):
    """Abstract repository for TES instance data"""
    
    @abstractmethod
    def get_all_instances(self) -> List[TESInstance]:
        pass
    
    @abstractmethod
    def get_instance_by_name(self, name: str) -> Optional[TESInstance]:
        pass
    
    @abstractmethod
    def update_instance_status(self, name: str, status: str, task_count: int, latency: int) -> None:
        pass


class FileWorkflowRepository(WorkflowRepository):
    """File-based implementation of workflow repository"""
    
    def __init__(self, storage_path: str):
        self.storage_path = Path(storage_path)
        self.batch_runs_file = self.storage_path / "batch_runs.json"
        self.workflow_runs_file = self.storage_path / "workflow_runs.json"
        
        # Ensure storage directory exists
        self.storage_path.mkdir(parents=True, exist_ok=True)
        
        # Initialize files if they don't exist
        if not self.batch_runs_file.exists():
            self._write_json(self.batch_runs_file, [])
        if not self.workflow_runs_file.exists():
            self._write_json(self.workflow_runs_file, [])
    
    def _read_json(self, file_path: Path) -> List[Dict]:
        try:
            with open(file_path, 'r') as f:
                return json.load(f)
        except (FileNotFoundError, json.JSONDecodeError):
            return []
    
    def _write_json(self, file_path: Path, data: List[Dict]) -> None:
        with open(file_path, 'w') as f:
            json.dump(data, f, indent=2, default=str)
    
    def save_workflow_run(self, workflow_run: WorkflowRun) -> None:
        """Save a workflow run (batch runs)"""
        batch_runs = self._read_json(self.batch_runs_file)
        batch_runs.append(workflow_run.to_dict())
        self._write_json(self.batch_runs_file, batch_runs)
    
    def get_workflow_run(self, run_id: str) -> Optional[WorkflowRun]:
        """Get a specific workflow run by ID"""
        # Check batch runs first
        batch_runs = self._read_json(self.batch_runs_file)
        for run_data in batch_runs:
            if run_data['run_id'] == run_id:
                return WorkflowRun.from_dict(run_data)
        
        # Check legacy workflow runs
        workflow_runs = self._read_json(self.workflow_runs_file)
        for run_data in workflow_runs:
            if run_data['run_id'] == run_id:
                return WorkflowRun.from_dict(run_data)
        
        return None
    
    def get_all_workflow_runs(self) -> List[WorkflowRun]:
        """Get all workflow runs"""
        all_runs = []
        
        # Load batch runs
        batch_runs = self._read_json(self.batch_runs_file)
        for run_data in batch_runs:
            try:
                all_runs.append(WorkflowRun.from_dict(run_data))
            except Exception as e:
                print(f"Error loading workflow run: {e}")
        
        # Load legacy workflow runs
        workflow_runs = self._read_json(self.workflow_runs_file)
        for run_data in workflow_runs:
            try:
                all_runs.append(WorkflowRun.from_dict(run_data))
            except Exception as e:
                print(f"Error loading legacy workflow run: {e}")
        
        return all_runs
    
    def update_workflow_status(self, run_id: str, status: str) -> bool:
        """Update workflow run status"""
        # Update in batch runs
        batch_runs = self._read_json(self.batch_runs_file)
        for run_data in batch_runs:
            if run_data['run_id'] == run_id:
                run_data['status'] = status
                self._write_json(self.batch_runs_file, batch_runs)
                return True
        
        # Update in workflow runs
        workflow_runs = self._read_json(self.workflow_runs_file)
        for run_data in workflow_runs:
            if run_data['run_id'] == run_id:
                run_data['status'] = status
                self._write_json(self.workflow_runs_file, workflow_runs)
                return True
        
        return False
    
    def delete_workflow_run(self, run_id: str) -> bool:
        """Delete a workflow run"""
        # Delete from batch runs
        batch_runs = self._read_json(self.batch_runs_file)
        original_length = len(batch_runs)
        batch_runs = [run for run in batch_runs if run['run_id'] != run_id]
        if len(batch_runs) < original_length:
            self._write_json(self.batch_runs_file, batch_runs)
            return True
        
        # Delete from workflow runs
        workflow_runs = self._read_json(self.workflow_runs_file)
        original_length = len(workflow_runs)
        workflow_runs = [run for run in workflow_runs if run['run_id'] != run_id]
        if len(workflow_runs) < original_length:
            self._write_json(self.workflow_runs_file, workflow_runs)
            return True
        
        return False
    
    def get_workflow_log(self, run_id: str) -> Optional[str]:
        """Get workflow log content"""
        workflow_run = self.get_workflow_run(run_id)
        if not workflow_run or not workflow_run.log_file_path:
            return None
        
        try:
            with open(workflow_run.log_file_path, 'r') as f:
                return f.read()
        except FileNotFoundError:
            return None


class StaticTESInstanceRepository(TESInstanceRepository):
    """Static file-based TES instance repository"""
    
    def __init__(self, locations_file: str):
        self.locations_file = Path(locations_file)
    
    def get_all_instances(self) -> List[TESInstance]:
        """Load TES instances from static file"""
        try:
            with open(self.locations_file, 'r') as f:
                locations_data = json.load(f)
            
            instances = []
            for data in locations_data:
                instance = TESInstance(
                    name=data['name'],
                    url=data.get('url', data.get('endpoint', '')),
                    country=data.get('country'),
                    lat=data.get('lat', data.get('latitude')),
                    lon=data.get('lon', data.get('longitude')),
                    ip=data.get('ip')
                )
                instances.append(instance)
            
            return instances
        except (FileNotFoundError, json.JSONDecodeError) as e:
            print(f"Error loading TES instances: {e}")
            return []
    
    def get_instance_by_name(self, name: str) -> Optional[TESInstance]:
        """Get a specific TES instance by name"""
        instances = self.get_all_instances()
        for instance in instances:
            if instance.name == name:
                return instance
        return None
    
    def update_instance_status(self, name: str, status: str, task_count: int, latency: int) -> None:
        """Update instance status (in-memory only for static repository)"""
        # In a real implementation, this might write to a cache or database
        pass
