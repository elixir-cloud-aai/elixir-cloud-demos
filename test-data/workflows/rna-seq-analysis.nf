#!/usr/bin/env nextflow

/*
 * RNA-seq Analysis Pipeline
 * Demonstrates a more complex bioinformatics workflow
 */

nextflow.enable.dsl=2

// Pipeline parameters
params.reads = "data/reads/*_{R1,R2}.fastq.gz"
params.reference = "data/reference/genome.fa"
params.annotation = "data/reference/genes.gtf"
params.output_dir = "results"
params.threads = 4
params.memory = "8 GB"

// Print pipeline information
log.info """\
    RNA-SEQ ANALYSIS PIPELINE
    =========================
    reads      : ${params.reads}
    reference  : ${params.reference}
    annotation : ${params.annotation}
    output     : ${params.output_dir}
    threads    : ${params.threads}
    memory     : ${params.memory}
    """

// Main workflow
workflow {
    // Create input channels
    reads_ch = Channel.fromFilePairs(params.reads, checkIfExists: false)
    reference_ch = Channel.fromPath(params.reference, checkIfExists: false)
    annotation_ch = Channel.fromPath(params.annotation, checkIfExists: false)
    
    // Quality control
    FASTQC(reads_ch)
    
    // Alignment
    STAR_ALIGN(reads_ch, reference_ch, annotation_ch)
    
    // Quantification
    FEATURECOUNTS(STAR_ALIGN.out.bam, annotation_ch)
    
    // Generate report
    MULTIQC(FASTQC.out.collect(), STAR_ALIGN.out.log.collect())
}

process FASTQC {
    tag "${sample_id}"
    publishDir "${params.output_dir}/fastqc", mode: 'copy'
    
    input:
    tuple val(sample_id), path(reads)
    
    output:
    path "fastqc_${sample_id}_logs"
    
    script:
    """
    mkdir fastqc_${sample_id}_logs
    echo "Running FastQC for ${sample_id}" > fastqc_${sample_id}_logs/fastqc.log
    echo "Read 1: ${reads[0]}" >> fastqc_${sample_id}_logs/fastqc.log
    echo "Read 2: ${reads[1]}" >> fastqc_${sample_id}_logs/fastqc.log
    echo "Quality check completed" >> fastqc_${sample_id}_logs/fastqc.log
    """
}

process STAR_ALIGN {
    tag "${sample_id}"
    publishDir "${params.output_dir}/alignments", mode: 'copy'
    cpus params.threads
    memory params.memory
    
    input:
    tuple val(sample_id), path(reads)
    path reference
    path annotation
    
    output:
    path "${sample_id}.bam", emit: bam
    path "${sample_id}_star.log", emit: log
    
    script:
    """
    echo "Aligning ${sample_id} with STAR" > ${sample_id}_star.log
    echo "Reference: ${reference}" >> ${sample_id}_star.log
    echo "Annotation: ${annotation}" >> ${sample_id}_star.log
    echo "Threads: ${params.threads}" >> ${sample_id}_star.log
    echo "Alignment completed" >> ${sample_id}_star.log
    
    # Create mock BAM file
    echo "Mock BAM content for ${sample_id}" > ${sample_id}.bam
    """
}

process FEATURECOUNTS {
    tag "${sample_id}"
    publishDir "${params.output_dir}/counts", mode: 'copy'
    
    input:
    path bam
    path annotation
    
    output:
    path "*.counts"
    
    script:
    sample_id = bam.baseName
    """
    echo "Counting features for ${sample_id}" > ${sample_id}.counts
    echo "Annotation: ${annotation}" >> ${sample_id}.counts
    echo "Gene1\t100" >> ${sample_id}.counts
    echo "Gene2\t250" >> ${sample_id}.counts
    echo "Gene3\t175" >> ${sample_id}.counts
    """
}

process MULTIQC {
    publishDir "${params.output_dir}/reports", mode: 'copy'
    
    input:
    path fastqc_logs
    path star_logs
    
    output:
    path "multiqc_report.html"
    
    script:
    """
    echo "<html><body><h1>MultiQC Report</h1>" > multiqc_report.html
    echo "<h2>FastQC Results</h2>" >> multiqc_report.html
    echo "<p>Quality control completed for all samples</p>" >> multiqc_report.html
    echo "<h2>STAR Alignment Results</h2>" >> multiqc_report.html
    echo "<p>Alignment completed for all samples</p>" >> multiqc_report.html
    echo "</body></html>" >> multiqc_report.html
    """
}
