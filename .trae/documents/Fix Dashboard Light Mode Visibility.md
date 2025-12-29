I have identified the root cause: the `AppLayout.vue` file was incorrectly checking `layoutConfig.darkTheme.value` as a string ("light"/"dark") instead of a boolean, which caused the `.layout-theme-light` class to never be applied. This prevented the CSS overrides from taking effect, leaving the Dashboard in a "broken" state (White Text on White Background or Dark Text on Dark Background).

I have fixed this by:
1.  **Correcting `AppLayout.vue`**: Changed the logic to `!layoutConfig.darkTheme.value` for light theme and `layoutConfig.darkTheme.value` for dark theme.
2.  **Enhancing `Dashboard.vue` CSS**: I have aggressively updated the CSS overrides for Light Mode to ensure:
    -   **Backgrounds**: Forced to White (`#ffffff`) or Light Gray (`#f5f7fa`).
    -   **Text**: Forced to Dark Gray (`#1f2937`) or Black.
    -   **Contrast**: Added darker borders and shadows to ensure elements stand out against the light background.
    -   **Canvas Colors**: Verified the script logic matches the CSS (Dark Blue borders for Light Mode).

Now, when you switch to Light Mode:
-   The page background will be Light Gray.
-   Cards will be White with subtle shadows.
-   Text will be Dark Gray/Black and clearly visible.
-   Canvas elements (Tech Borders) will be blue/dark blue.

This directly addresses your issue of "completely unable to see data" and "KPI parameters are still dark".
