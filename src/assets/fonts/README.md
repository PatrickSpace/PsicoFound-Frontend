# Local UI fonts

Poppins: Google Fonts Poppins v24, weights 300/400/500/600/700, WOFF2, Latin and extended Latin plus punctuation/currency. The browser downloads only the weights it renders. `Poppins-OFL.txt` accompanies the font. MDI: @mdi/font 7.4.47, only the application's literal icons and Vuetify's default aliases; `MDI-LICENSE.txt` accompanies it.

`vite.config.js` checks icon/component coverage during build. Add new Vuetify components to `src/plugins/theme/components.js` using their component entrypoint (for example, `VCol` is exported by `vuetify/components/VGrid`). This avoids loading styles for unused components.

To regenerate MDI after adding an icon, install `fonttools[woff]` in a temporary Python virtual environment and run `python src/assets/fonts/subset-mdi.py` from the repository root. This is a developer action, not a build/runtime dependency. The output preserves original glyph codepoints and all Vuetify aliases. Never replace a missing glyph silently.
