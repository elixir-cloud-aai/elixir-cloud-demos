#!/usr/bin/env nextflow

/*
 * Nextflow Hello World Pipeline
 * A simple demonstration pipeline for testing Nextflow functionality
 */

nextflow.enable.dsl=2

// Define parameters with default values
params.greeting = "Hello"
params.name = "World"
params.output_dir = "results"
params.count = 5

// Print pipeline information
log.info """\
    HELLO WORLD PIPELINE
    ====================
    greeting   : ${params.greeting}
    name       : ${params.name}
    output     : ${params.output_dir}
    count      : ${params.count}
    """

// Define the main workflow
workflow {
    // Create input channel
    input_ch = Channel.of(1..params.count)
    
    // Run the greeting process
    GREETING(input_ch, params.greeting, params.name)
    
    // Collect and save results
    COLLECT_RESULTS(GREETING.out.collect())
}

// Process to generate greetings
process GREETING {
    tag "greeting_${id}"
    publishDir "${params.output_dir}/greetings", mode: 'copy'
    
    input:
    val id
    val greeting
    val name
    
    output:
    path "greeting_${id}.txt"
    
    script:
    """
    echo "${greeting}, ${name} from process ${id}!" > greeting_${id}.txt
    echo "Generated on: \$(date)" >> greeting_${id}.txt
    echo "Process ID: ${id}" >> greeting_${id}.txt
    """
}

// Process to collect all results
process COLLECT_RESULTS {
    publishDir "${params.output_dir}", mode: 'copy'
    
    input:
    path greeting_files
    
    output:
    path "summary.txt"
    
    script:
    """
    echo "Nextflow Hello World Pipeline Summary" > summary.txt
    echo "====================================" >> summary.txt
    echo "Generated \$(ls greeting_*.txt | wc -l) greeting files" >> summary.txt
    echo "Files:" >> summary.txt
    ls -la greeting_*.txt >> summary.txt
    echo "" >> summary.txt
    echo "Contents:" >> summary.txt
    cat greeting_*.txt >> summary.txt
    """
}
