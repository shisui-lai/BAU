I will update `src/renderer/src/views/Dashboard/Dashboard.vue` to add light mode styles for the header section.

**Plan:**
1.  Locate the `<style scoped lang="scss">` section in `Dashboard.vue`.
2.  Append a new CSS block using the `:global(.layout-theme-light)` selector to target the light mode.
3.  Inside this block, override styles for the header elements (`.tech-header-container`, `.hud-center`, `.title-box`, `.status-module`, `.logo-module`, etc.):
    *   **Backgrounds**: Change from dark/transparent-dark to white/light-gray gradients.
    *   **Text Colors**: Change white text to black.
    *   **Preserve Blues**: Ensure borders and blue text/icons remain unchanged.
    *   **Preserve Reds**: Ensure error states (disconnected) remain unchanged.
    *   **Specific Overrides**:
        *   `.tech-header-container`: Light gradient background.
        *   `.hud-center`: Light background.
        *   `.main-title` & `.logo-main`: Black text, remove text-shadow/gradients that make it look white.
        *   `.status-module`, `.time-module`, `.sd-status-module`, `.logo-module`: Light backgrounds, update text colors.
4.  Verify that no other sections (body, charts, etc.) are affected.

**Implementation Detail:**
```scss
/* ... existing styles ... */

/* Light Mode Adaptation - Header Only */
:global(.layout-theme-light) {
  .tech-header-container {
    background: linear-gradient(to bottom, #ffffff 0%, #f0f2f5 100%);
  }

  .hud-center {
    background: rgba(255, 255, 255, 0.8);
  }

  .main-title {
    color: #000;
    text-shadow: none;
  }

  .status-module, .time-module, .sd-status-module {
    background: rgba(255, 255, 255, 0.9);
    
    .module-text {
      .label { color: #666; }
      .value { color: #000; }
    }
  }
  
  .time-module .time-main {
    color: #000;
  }

  .logo-module {
    background: linear-gradient(90deg, #ffffff, #f0f2f5);
    
    .logo-main {
      color: #000;
      background: none;
      -webkit-text-fill-color: #000;
      text-shadow: none;
    }
  }
}
```