# Bioinformatics Data Processing Pipeline
# Demonstrates a more complex Snakemake workflow

configfile: "config.yaml"

# Define samples from config
SAMPLES = config["samples"]

# Final outputs
rule all:
    input:
        expand("results/processed/{sample}.processed", sample=SAMPLES),
        "results/summary/pipeline_report.html",
        "results/summary/combined_stats.txt"

# Quality control step
rule quality_control:
    input:
        "data/raw/{sample}.fastq"
    output:
        qc="results/qc/{sample}.qc",
        report="results/qc/{sample}_qc_report.txt"
    params:
        threshold=config["quality_threshold"]
    threads: config["threads"]
    resources:
        mem_mb=8000
    shell:
        """
        mkdir -p results/qc
        echo "Running quality control for {wildcards.sample}" > {output.report}
        echo "Input: {input}" >> {output.report}
        echo "Quality threshold: {params.threshold}" >> {output.report}
        echo "Threads: {threads}" >> {output.report}
        echo "Memory: {resources.mem_mb}MB" >> {output.report}
        echo "QC passed" > {output.qc}
        echo "{wildcards.sample}" >> {output.qc}
        """

# Data processing step
rule process_data:
    input:
        qc="results/qc/{sample}.qc",
        raw="data/raw/{sample}.fastq"
    output:
        processed="results/processed/{sample}.processed"
    params:
        mode=config["analysis_mode"]
    shell:
        """
        mkdir -p results/processed
        echo "Processing {wildcards.sample} in {params.mode} mode" > {output.processed}
        echo "QC input: {input.qc}" >> {output.processed}
        echo "Raw data: {input.raw}" >> {output.processed}
        echo "Processing completed" >> {output.processed}
        """

# Generate summary statistics
rule generate_stats:
    input:
        expand("results/processed/{sample}.processed", sample=SAMPLES)
    output:
        "results/summary/combined_stats.txt"
    shell:
        """
        mkdir -p results/summary
        echo "Pipeline Statistics Summary" > {output}
        echo "===========================" >> {output}
        echo "Total samples processed: $(echo {input} | wc -w)" >> {output}
        echo "Analysis mode: {config[analysis_mode]}" >> {output}
        echo "Quality threshold: {config[quality_threshold]}" >> {output}
        echo "" >> {output}
        echo "Sample details:" >> {output}
        for file in {input}; do
            sample=$(basename $file .processed)
            echo "- $sample: processed" >> {output}
        done
        """

# Generate HTML report
rule generate_report:
    input:
        stats="results/summary/combined_stats.txt",
        processed=expand("results/processed/{sample}.processed", sample=SAMPLES)
    output:
        "results/summary/pipeline_report.html"
    shell:
        """
        echo "<html><head><title>Pipeline Report</title></head><body>" > {output}
        echo "<h1>Bioinformatics Pipeline Report</h1>" >> {output}
        echo "<h2>Summary</h2>" >> {output}
        echo "<pre>" >> {output}
        cat {input.stats} >> {output}
        echo "</pre>" >> {output}
        echo "<h2>Processed Files</h2><ul>" >> {output}
        for file in {input.processed}; do
            sample=$(basename $file .processed)
            echo "<li>$sample</li>" >> {output}
        done
        echo "</ul></body></html>" >> {output}
        """

# Create mock input data
rule create_mock_data:
    output:
        "data/raw/{sample}.fastq"
    shell:
        """
        mkdir -p data/raw
        echo "@{wildcards.sample}_read1" > {output}
        echo "ATCGATCGATCGATCG" >> {output}
        echo "+" >> {output}
        echo "IIIIIIIIIIIIIIII" >> {output}
        """
