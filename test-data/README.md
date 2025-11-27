# TES Dashboard Test Data

This directory contains sample files for testing various functionalities of the TES Dashboard application.

## Directory Structure

```
test-data/
├── workflows/              # Sample workflow files
│   ├── hello-world.cwl    # Simple CWL workflow
│   ├── data-processing.cwl # Complex CWL workflow  
│   ├── hello-world.nf     # Simple Nextflow pipeline
│   ├── rna-seq-analysis.nf # Complex Nextflow pipeline
│   ├── Snakefile          # Simple Snakemake workflow
│   ├── bioinformatics-pipeline.smk # Complex Snakemake workflow
│   └── config.yaml        # Snakemake configuration
├── tasks/                 # Sample TES task definitions
│   ├── hello-world-task.json # Simple task
│   ├── data-processing-task.json # Data processing task
│   ├── bioinformatics-analysis.json # Complex bioinformatics task
│   └── gpu-ml-training.json # GPU-enabled ML training task
├── batch-processing/      # Sample batch job configurations
│   ├── hello-world-batch.json # Simple batch processing
│   ├── data-analysis-batch.json # Data analysis batch
│   ├── genomics-pipeline-batch.json # Genomics pipeline batch
│   └── ml-hyperparameter-batch.json # ML hyperparameter sweep
├── sample-input.txt       # Sample input file
├── sample-data.csv        # Sample CSV data
└── config.json           # Sample configuration file
```

## Usage Instructions

### For Workflows
1. Navigate to the **Workflows** page in the TES Dashboard
2. Click "Upload Workflow" 
3. Select any of the workflow files from the `workflows/` directory
4. Configure parameters as needed
5. Submit for execution

### For Tasks
1. Go to the **Submit Task** page
2. Use "Import from JSON" feature
3. Select any task file from the `tasks/` directory
4. Modify parameters as needed
5. Submit the task

### For Batch Processing  
1. Visit the **Batch Processing** page
2. Click "Import Batch Configuration"
3. Select any batch file from the `batch-processing/` directory
4. Review the batch configuration
5. Submit the batch job

## File Descriptions

### Workflow Files
- **hello-world.cwl**: Basic CWL workflow demonstrating input/output handling
- **data-processing.cwl**: Multi-step CWL workflow with file processing
- **hello-world.nf**: Simple Nextflow pipeline with parameterization  
- **rna-seq-analysis.nf**: Complex RNA-seq analysis pipeline
- **Snakefile**: Basic Snakemake workflow with configuration
- **bioinformatics-pipeline.smk**: Advanced bioinformatics pipeline

### Task Files
- **hello-world-task.json**: Simple echo task for testing
- **data-processing-task.json**: Data processing with multiple inputs/outputs
- **bioinformatics-analysis.json**: Comprehensive genomics analysis task
- **gpu-ml-training.json**: GPU-accelerated machine learning training

### Batch Files
- **hello-world-batch.json**: Parallel execution of simple tasks
- **data-analysis-batch.json**: Complex data analysis with dependencies
- **genomics-pipeline-batch.json**: Large-scale genomics analysis
- **ml-hyperparameter-batch.json**: ML model optimization batch

### Data Files
- **sample-input.txt**: Text file for testing file inputs
- **sample-data.csv**: CSV data for testing data processing tasks
- **config.json**: Sample configuration file for workflows

## Testing Scenarios

### Basic Functionality
1. Upload and execute hello-world workflows/tasks
2. Test file input/output with sample data files
3. Monitor task execution and logs

### Advanced Features
1. Test workflow dependency management
2. Batch processing with parallel execution
3. Resource allocation and GPU tasks
4. Error handling and retry mechanisms

### Integration Testing
1. End-to-end workflow execution
2. Cross-platform compatibility (CWL, Nextflow, Snakemake)
3. Large-scale batch processing
4. Performance monitoring

## Notes
- All files are designed to work without external dependencies
- Resource requirements are set to reasonable defaults for testing
- Output locations use placeholder URLs that should be configured for your environment
- Modify file paths and URLs as needed for your specific TES setup
