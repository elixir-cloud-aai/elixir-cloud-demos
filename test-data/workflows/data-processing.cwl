#!/usr/bin/env cwl-runner

cwlVersion: v1.2
class: Workflow

doc: |
  A bioinformatics data processing workflow for testing.
  Demonstrates file processing, filtering, and analysis steps.

inputs:
  input_file:
    type: File
    doc: "Input data file for processing"
  
  filter_threshold:
    type: float
    default: 0.05
    doc: "Quality threshold for filtering"
  
  analysis_mode:
    type: string
    default: "standard"
    doc: "Analysis mode: standard or advanced"

outputs:
  processed_data:
    type: File
    outputSource: analyze_data/results
    doc: "Final processed results"
  
  quality_report:
    type: File
    outputSource: quality_check/report
    doc: "Quality assessment report"
  
  summary_stats:
    type: File
    outputSource: generate_summary/stats
    doc: "Summary statistics"

steps:
  preprocess:
    run: "#preprocess_tool"
    in:
      input_data: input_file
    out: [cleaned_data]
  
  quality_check:
    run: "#quality_tool"
    in:
      data: preprocess/cleaned_data
      threshold: filter_threshold
    out: [filtered_data, report]
  
  analyze_data:
    run: "#analysis_tool"
    in:
      processed_data: quality_check/filtered_data
      mode: analysis_mode
    out: [results]
  
  generate_summary:
    run: "#summary_tool"
    in:
      analysis_results: analyze_data/results
    out: [stats]

requirements:
  - class: SubworkflowFeatureRequirement
  - class: StepInputExpressionRequirement
