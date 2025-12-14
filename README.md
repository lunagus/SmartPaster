# 📋 Smart Paster

Smart Paster is a privacy-focused browser extension designed to streamline data entry by managing and pasting frequently used text snippets. Built for Chromium-based browsers (Chrome, Edge, Brave) and Firefox, it operates entirely offline using local storage.

## WHY?

I simply got tired of typing the same things over and over again. I wanted a way to instantly access and paste my frequently used text—like emails, addresses, or code snippets—without having to hunt for them in a separate document every time. It’s designed to replace the messy 'Untitled.txt' file on your desktop with something faster, private and cleaner.

## ✨ Features

- **Context Menu Integration**: Right-click on any input field to access and paste your saved snippets immediately.
- **Privacy First**: All data is stored locally on your device using the browser's storage API. No data is ever sent to external servers.
- **Quick Add Workflow**: Highlight text on any webpage, right-click, and select "Add to Smart Paster" to save it instantly without navigating away.
- **Comfortable Grid Dashboard**: A responsive, and modern terminal-inspired dashboard for managing your collection.
- **Search & Filter**: Real-time filtering to quickly locate specific snippets.
- **Inline Editing**: Add and edit snippets directly within the dashboard grid.

## 🚀 Installation

Since this extension is designed for private use or development, it is loaded manually. First, **Clone or Download** this repository to your local machine.

### Chromium Browsers (Chrome, Edge, Brave)
1.  Go to `chrome://extensions`.
2.  Enable **Developer Mode** (usually a toggle in the top-right corner).
3.  Click **Load Unpacked**.
4.  Select the directory containing the `manifest.json` file (the root of this project).

### Firefox
1.  Go to `about:debugging#/runtime/this-firefox`.
2.  Click **Load Temporary Add-on...**.
3.  Select the `manifest.json` file inside the project directory.

## 💡 Usage

### Managing Snippets
1.  Click the extension icon in your browser toolbar to open the **Options** page (or right-click the icon and select Options).
2.  **To Add**: Use the Quick Input bar at the top or click the `(+)` button.
3.  **To Edit**: Click the "Edit" button on any snippet card.
4.  **To Delete**: Click "Delete" and confirm the action in the modal.

### Pasting Data
1.  Right-click on any text input, textarea, or content-editable field on a website.
2.  Hover over the **Smart Paster** menu item.
3.  Select the desired snippet to insert the text at your cursor position.

### Storing Data from Web
1.  Highlight text on any webpage.
2.  Right-click the selection.
3.  Select **Add to Smart Paster**.
4.  Enter a label for the snippet in the prompt.

## 🗺️ Roadmap & Upcoming Features

- [ ] **Categories/Tags**: Organize snippets into folders or groups (e.g., "Work", "Personal").
- [ ] **Sorting Options**: Sort and pin snippets by Name, Date Added, Category, or Usage Frequency.
- [ ] **Custom Icons**: Assign specific icons to snippets for faster visual recognition and modify existing ones.
- [ ] **Backup & Restore**: Export your collection to JSON and import it on other devices.
- [ ] **Settings Page**: Customize the extension behavior (e.g., default copy behavior, theme toggles).
- [ ] **Keyboard Shortcuts**: Hotkeys to quickly open the dashboard or paste specific snippets.

## 🤝 Contributing

Contributions are welcome! If you'd like to improve Smart Paster, please feel free to submit a Pull Request.

**To report bugs or request features**: [https://github.com/lunagus/SmartPaster/issues](https://github.com/lunagus/SmartPaster/issues)

## 📄 License

This project is open source and available under the [MIT License](LICENSE).
