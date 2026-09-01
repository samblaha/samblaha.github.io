---
title: "Quantum Random Number Generator"
date: 2024-03-10
summary: "Truly random numbers from a quantum circuit: n qubits put into superposition with Hadamard gates using IBM Qiskit."
tags:
  - Quantum
  - Python
  - Cryptography
status: "Shipped"
repo: "https://github.com/samblaha/QRNG"
specs:
  Framework: "IBM Qiskit"
  Circuit: "n qubits, each through a Hadamard gate"
  Output: "Truly random numbers"
---

## Overview
This is a quantum random number generator I created using IBM Qiskit. It generates a truly random number by leveraging a quantum circuit with n qubits, each initialized into a superposition state using Hadamard gates.

## How it works
- Build a circuit with n qubits.
- Apply a Hadamard gate to each one, putting it in an equal superposition of 0 and 1.
- Measure every qubit. Each collapses to 0 or 1 with genuinely random outcome.
- Read the measured bits as an n-bit random number.

![Terminal output from the script: a fresh random number straight from the circuit.](/assets/projects/quantum-random-number-generator/hero.png)
