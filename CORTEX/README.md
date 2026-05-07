# CORTEX — Note Rush Cyberfunk Brain

AI persistent knowledge base for this project.
Update files here after every significant change.

## Structure

```
CORTEX/
  README.md                    ← this file
  todo.md                      ← live task tracker across sessions
  glossary.md                  ← domain + code vocabulary
  knowledge/
    architecture.md            ← module map, exports, dependency graph
    game-loop.md               ← state machine, phases, scoring, unlock curve
    music-theory.md            ← AN[] table, scale types, solfège system
    css-system.md              ← design tokens, palette, component classes
    mobile.md                  ← touch patterns, haptics, scroll sync
    audio.md                   ← Web Audio synthesis, iOS unlock
  skills/
    new-phase.md               ← recipe: add a new game phase
    new-component.md           ← recipe: add a JS UI factory component
    new-css-component.md       ← recipe: add CSS component with variants
```

## How to use before making changes

1. Read `knowledge/architecture.md` — know the dependency graph
2. Read the relevant `knowledge/` file for the area you're changing
3. Read the relevant `skills/` recipe if adding something new
4. After changes, update the relevant knowledge files + todo.md
