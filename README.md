# JARVIS AI — Stage 1 Foundation & Premium User Interface

Welcome to the **JARVIS AI** project. This is **Stage 1: Foundation & Premium User Interface**, a pristine, high-fidelity, and cinematic application shell constructed completely from scratch. 

It is designed with responsive, GPU-friendly motion animations, clean type pairings, and a centralized state architecture ready for future voice, memory, and model integrations.

---

## 🎨 Design Direction

The interface is built to feel like a high-end personal operating system:
- **Atmospheric Palette**: Sophisticated deep navy and charcoal slates (`#05070a`) offset by custom color state accents (Cyan, Purple, Blue, Amber, Red).
- **GPU-Friendly Motion**: Pure SVG coordinates and layout animations constructed with `motion/react` to prevent layout reflow stutter.
- **Strict Aesthetic Restraint**: No cheap sci-fi visual "slop", fake telemetry, or distracting neon gradients. Visual interest is achieved purely through precise tracking, high-contrast layouts, and generous negative space.

---

## 🗄️ System Architecture

All logic is separated cleanly to maintain a modular footprint:

```
├── README.md               # Diagnostic guide & architectural mapping
├── index.html              # HTML shell entrypoint
├── metadata.json           # Application configurations & frame permissions
├── package.json            # Script registries and core dependencies
├── src/
│   ├── App.tsx             # Central application layout & State controller
│   ├── index.css           # Global custom classes, typography, and scrollbars
│   ├── main.tsx            # Main React mount entrypoint
│   ├── types.ts            # Type safety interfaces and central State models
│   └── components/
│       ├── CoreVisualizer.tsx            # Animated AI core representing States
│       ├── ConversationArea.tsx          # Conversation/chat simulation terminal
│       ├── DeveloperTestingConsole.tsx   # Diagnostic overrides & event logger
│       ├── SettingsPanel.tsx             # Parameters configurator shell
│       └── ModulePlaceholder.tsx         # Out-of-scope tab layouts for Stage 2+
```

---

## ⚡ Centralized State Machine

JARVIS relies on a single, centralized state model that governs both physical rendering and logic flows:

$$\text{IDLE} \longrightarrow \text{LISTENING} \longrightarrow \text{THINKING} \longrightarrow \text{SPEAKING} \longrightarrow \text{IDLE}$$
$$\text{ERROR} \longrightarrow \text{IDLE}$$

This architecture is prepared to block incoming microphone listener streams during voice output (`SPEAKING`), preventing feedback loops.
- **Manual Overrides**: Use the **Developer State Control** panel to inject states instantly and test transitions.
- **Automated Lifecycle Routine**: Click the **Trigger AI Dialogue Loop** or submit custom messages to observe the real-time simulation flow of inputs, logic, output rendering, and cooldown.

---

## 🛠️ How to Run the Project

1. **Install Dependencies**:
   ```bash
   npm install
   ```

2. **Boot Development Server**:
   ```bash
   npm run dev
   ```

3. **Production Compilation**:
   ```bash
   npm run build
   ```
