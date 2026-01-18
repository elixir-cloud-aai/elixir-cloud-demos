from utils.file_utils import load_batch_runs, save_batch_runs

batch_runs = load_batch_runs()
save_batch_runs(batch_runs)

def get_batch_runs():
    return batch_runs

def add_batch_run(batch_run):
    batch_runs.append(batch_run)
    save_batch_runs(batch_runs)
