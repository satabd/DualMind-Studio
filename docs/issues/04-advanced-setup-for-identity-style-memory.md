# [Feature] Advanced setup panel for identity, style, and memory

## Problem

The current setup UI is strong for orchestration, but it does not yet expose the next-generation concepts that define DualMind Studio.

## Proposed Change

Add an advanced setup section for:

- agent identity
- operating style
- memory usage mode
- protocol overrides where appropriate

## Why It Matters

Users need a visible model for what makes this repo different from the original one.

## Initial Scope

- keep the default UI simple
- place new controls in an advanced section
- persist settings locally

## Acceptance Criteria

- advanced users can configure identity/style/memory directly
- defaults remain understandable for normal use
- the UI language matches the backend model
