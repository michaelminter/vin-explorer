# VIN List Chrome Extension
A simple Google Chrome extension that makes a call to Auto Trader's public API and displays a JSON object of vehicle information and VINs; As provided by the API response.

<p align="center">
  <img src="https://github.com/michaelminter/vin-explorer/blob/main/assets/screenshots/screenshot.png?raw=true" alt="Screenshot of the extension" width="500px" style="max-width: 100%">
</p>

## Privacy is important!

* Data is only saved locally to the user's browser for UX purposes and to prevent API abuse due to user error.
* The extension makes a whitehat API call
* No data is ever sent to any 3rd-party servers. You must manually copy/paste from the generated list, if you so choose to.

## Data saved locally

Since the extension state is reloaded on every opening, storing certain data helps improve UX. As a reminder, all data is saved locally and never sent/shared with any 3rd party.

* **pastVINIds** - An array of IDs as retrieved from API, formatted to a new JSON object. This is stored so that there's no blank textarea after a retrieval from the pop up closing due to navigation or user error.
* **pastVINsDate** - Date timestamp since the last successful API response, to display to the user via "Last retrieved on" text in the footer. Helps communicate how fresh the saved friend IDs data is.
* **lastError** - A string identifier for the last error received from a failed response. For example, it's used for toggling the authentication error visual.
* **lastPressedDate** - Date timestamp since the last time the "Get VINs" button was pressed. This is to rate limit requests that prevents API abuse from user error. Used on the UI to calculate and show the animated button countdown.

## Development

Getting the extension to run for use and development is thankfully pretty easy.

1. Clone the repository
2. Go to chrome://extensions
3. Enable Developer Mode via the switch control on the right side of the blue header.
4. Click "Load unpacked" and choose the root folder of the cloned repository.

And done! It should now show up in your extensions. Edits made to the files will be reflected on every extension popup load (button click).

## Sources
- https://www.reshot.com/free-svg-icons/item/car-JTHMP24D5S/
- https://pixabay.com/users/cr-ai-tive-37787227/
