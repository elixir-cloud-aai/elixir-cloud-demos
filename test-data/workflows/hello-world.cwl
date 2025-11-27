#!/usr/bin/env cwl-runner

cwlVersion: v1.2
class: CommandLineTool

doc: |
  A simple Hello World workflow for testing CWL functionality.
  This workflow demonstrates basic input/output handling and command execution.

baseCommand: echo

inputs:
  message:
    type: string
    default: "Hello, World from CWL!"
    doc: "The message to print"
    inputBinding:
      position: 1

outputs:
  output:
    type: stdout
    doc: "The printed message"

stdout: hello-world-output.txt

requirements:
  - class: DockerRequirement
    dockerPull: ubuntu:20.04
  - class: ResourceRequirement
    ramMin: 100
    coresMin: 1

hints:
  - class: InitialWorkDirRequirement
    listing:
      - entryname: input.txt
        entry: $(inputs.message)

label: "Hello World CWL Test"
