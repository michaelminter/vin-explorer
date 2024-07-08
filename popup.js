(() => {
  const authErrorEl = document.getElementById('authError');
  // const displayCheckboxEl = document.getElementById('vinDisplayCheckbox');
  const zipCodeField = document.getElementById('zipCodeField');
  const buttonEl = document.getElementById('idsButton');
  const buttonCountEl = document.getElementById('idsButtonCount');
  const lastUpdatedEl = document.getElementById('lastUpdated');
  const loadingEl = document.getElementById('loading');
  const textareaEl = document.getElementById('idsTextarea');
  const rateLimitTimeOut = 3;

  let countdownInterval;

  const friendsIdsKey = 'pastListings';
  const vinsKey = 'vins';
  const friendsIdsDateKey = 'pastListingsDate';
  const lastErrorKey = 'lastError';
  const lastPressedDateKey = 'lastPressedDate';

  const errorValues = {
    auth: 'authError',
  };

  /**
   * Runtime logic, called at the bottom of the script.
   */
  async function init() {
    handleRateLimiting();

    let data = await getData();

    zipCodeField.value = data.zipCode ? data.zipCode : '';

    // Populate with prior data.
    presentListings(data[friendsIdsKey] ? data[friendsIdsKey] : []);
    changeLastUpdated(data[friendsIdsDateKey]);

    // Show instructions based on prior state.
    if (data[lastErrorKey] === errorValues.auth) showAuthError(true);

    // Event listeners.
    buttonEl.addEventListener('click', handleButtonEvent);
  }

  /*
   * Core Functions
   * ------------------------------------------------------------------------ */

  /**
   * Button onClick event for adding listings to textarea.
   * @param {*} event Button element event object.
   */
  async function handleButtonEvent(event) {
    event.preventDefault();

    // Do nothing if disabled, disable if not already.
    if (buttonEl.disabled === true) return false;

    showLoading(true);

    const zipCode = zipCodeField.value;

    if (!zipCode) {
      showLoading(false);
      zipCodeField.classList.add('error');
      return;
    } else {
      saveData('zipCode', zipCode);
      zipCodeField.classList.remove('error');
    }

    // Create an array of 0 - 290, in increments of 10.
    const pages = Array(30).fill(0).map((e, i) => i * 10);

    // const url = 'https://autotrader.com/rest/searchresults/base?' +
    const url = 'https://www.autotrader.com/rest/lsc/listing?' +
      'startYear=2019&' +
      'endYear=2023&' +
      'listingType=USED&' +
      // 'vehicleStyleCode=SEDAN&' +
      // 'maxMileage=60000&' +
      // 15000 (under), 30000, 45000, 60000, 75000, 100000, 150000, 200000, 200001 (over), 0 (any)
      'mileage=100000' +
      'maxPrice=30000&' +
      'zip=' + zipCode + '&' +
      // 10, 25, 50, 75, 100, 200, 300, 400, 500, 0 (Nationwide)
      'searchRadius=0&' +
      'sortBy=relevance&' +
      'numRecords=10&' +
      'firstRecord=' + pages[Math.floor(Math.random() * pages.length)];

    // Fetch data
    const response = await fetch(url);

    removePriorRetrievedData();

    if (response.status === 200) {
      showAuthError(false);
      handleResponseSuccess(response);
      handleRateLimiting(getCurrentTimeInSeconds());
    } else {
      handleResponseFailure(response);
    }

    showLoading(false);
  }

  /**
   * Handles the successful response.
   * @param {*} response Response object from fetch()
   */
  async function handleResponseSuccess(response) {
    const listings = (await response.json()).listings.map(function(listing) {
      return {
        bodyStyle: listing.bodyStyles[0].code,
        kbbVehicleId: listing.kbbVehicleId,
        vin: listing.vin,
        title: [listing.year, listing.make.name, listing.model.name].join(' '),
        mileage: listing.specifications.mileage.value,
        price: '$' + listing.pricingDetail.salePrice.toLocaleString("en-US"),
        color: listing.specifications.color.value,
      }
    });
    const lastUpdatedDate = getCurrentTimeInSeconds() * 1000;

    saveData(friendsIdsKey, listings);
    changeLastUpdated(lastUpdatedDate);
    saveData(friendsIdsDateKey, lastUpdatedDate);
    presentListings(listings);
  }

  function presentListings(listings) {
    textareaEl.innerHTML = '';

    for (let i = 0; i < listings.length; i++) {
      const itemEl = createListItem(listings[i]);
      if (itemEl) textareaEl.appendChild(itemEl);
    }
  }

  /**
   * Creates element from listing object.
   * @param {*} listing Response object from fetch()
   */
  function createListItem(listing) {
    const vins = JSON.parse(localStorage.getItem(vinsKey));

    let row = document.createElement('div');
    row.className = 'row';

    let iconWrapper = document.createElement('div');
    iconWrapper.className = 'icon-wrapper tooltip';

    let icon = document.createElement('span');
    icon.altText = listing.color;
    icon.className = 'icon ' + listing.bodyStyle.toLowerCase();
    // icon.style.backgroundColor = listing.color;
    icon.style.backgroundColor = '#001e38';

    let iconTooltip = document.createElement('span');
    iconTooltip.className = 'tooltiptext';
    iconTooltip.textContent = listing.bodyStyle;

    let content = document.createElement('div');
    content.className = 'content';

    let color = document.createElement('span');
    color.className = 'color';
    color.style.backgroundColor = listing.color;

    let title = document.createElement('div');
    title.textContent = [listing.title, listing.price, listing.mileage, ' '].join(' | ');
    title.className = 'title';
    title.appendChild(color);

    let vin = document.createElement('div');
    vin.textContent = listing.vin + ' \u2704'; // \u2713 = checkmark
    vin.className = 'vin';

    content.appendChild(title);
    content.appendChild(vin);

    iconWrapper.appendChild(icon);
    iconWrapper.appendChild(iconTooltip);

    row.appendChild(iconWrapper);
    row.appendChild(content);

    if (vins && vins.includes(listing.vin)) {
      // if (displayCheckboxEl.checked) {
      //   return null;
      // }
      vin.style.color = '#ccc';
    }

    vin.addEventListener('click', (_listener) => {
      navigator.clipboard.writeText(listing.vin).then((res) => {
        let vins = JSON.parse(localStorage.getItem(vinsKey));

        if (vins && vins.includes(listing.vin)) return;

        if (!vins) {
          localStorage.setItem(vinsKey, JSON.stringify([listing.vin]));
        } else {
          vins.push(listing.vin);
          localStorage.setItem(vinsKey, JSON.stringify(vins));
        }
        vin.style.color = '#ccc';

        console.log(localStorage.getItem(vinsKey));
      });
    });

    return row;
  }

  /**
   * Handles an error response, possibly from authentication or API ban.
   * @param {*} response Response object from fetch()
   */
  function handleResponseFailure(response) {
    switch(response.status) {
      case 401:
        // Not logged in, show instruction and navigate to page.
        showAuthError(true);
        break;
      default:
        // Default error, try again later.
        handleRateLimiting(getCurrentTimeInSeconds());
    }
  }

  /**
   * Disable button if rate limited.
   * This prevents unintentionally abusing API resources.
   * @param {Date.getTime() / 1000} lastPressedDateInSeconds
   */
  async function handleRateLimiting(lastPressedDateInSeconds = null) {
    const currentTimeInSeconds = getCurrentTimeInSeconds();

    if (lastPressedDateInSeconds) {
      saveData(lastPressedDateKey, lastPressedDateInSeconds);
    } else {
      lastPressedDateInSeconds = await getSavedDate();
    }


    // If there's no saved data, that means the user is opening the extension for the first time ever.
    // In this case, don't rate limit this first request for friend IDs.
    if (lastPressedDateInSeconds === null) {
      return;
    }

    const secondsSinceLastPressed = currentTimeInSeconds - lastPressedDateInSeconds;

    if (secondsSinceLastPressed < rateLimitTimeOut || !(currentTimeInSeconds <= 0))
      startCountdown(lastPressedDateInSeconds + rateLimitTimeOut);
  }

  /*
   * UX Functions
   * ------------------------------------------------------------------------ */

  /**
   * Display authentication error to user.
   * @param {boolean} show Whether to show or not.
   */
  function showAuthError(show) {
    if (show) {
      textareaEl.style.display = 'none';
      authErrorEl.style.display = 'block';
      saveData(lastErrorKey, errorValues.auth);
    } else {
      textareaEl.removeAttribute('style');
      authErrorEl.removeAttribute('style');
      saveData(lastErrorKey, null);
    }
  }

  /**
   * Handles displaying the "Last retrieved on" data.
   * @param {*} date
   */
  function changeLastUpdated(date) {
    const lastUpdatedDateEl = lastUpdatedEl.getElementsByTagName('span')[0];
    const dateOptions = {
      weekday: 'long',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    };
    if (!date) {
      lastUpdatedEl.style.display = 'none';
    } else {
      lastUpdatedEl.style.display = 'block';
      lastUpdatedDateEl.textContent =
          new Date(date).toLocaleDateString(undefined, dateOptions);
    }
  }

  /**
   * Toggles display of loading element over textarea.
   * @param {boolean} show Whether or not to show the loading indicator.
   */
  function showLoading(show) {
    if (show) {
      textareaEl.value = '';
      loadingEl.style.display = 'block';
    } else {
      loadingEl.removeAttribute('style');
    }
  }

  /**
   * Creates the interval for the button countdown state.
   * @param {*} futureDateInSeconds
   */
  function startCountdown(futureDateInSeconds) {
    buttonCountdown(futureDateInSeconds);
    countdownInterval = setInterval(() => {
      buttonCountdown(futureDateInSeconds);
    }, 1000);
  }

  /**
   * Handles the disabled countdown display of the button.
   * @param {*} countdown number of seconds to show in button.
   */
  function buttonCountdown(futureDateInSeconds = 0) {
    const countdown =
        Math.ceil(futureDateInSeconds - getCurrentTimeInSeconds());
    if (countdown > 0) {
      buttonEl.disabled = true;
      buttonCountEl.textContent = `(${countdown})`;
      buttonCountEl.style.display = 'inline-block';
    } else {
      buttonEl.disabled = false;
      buttonCountEl.style.display = 'none';
      clearInterval(countdownInterval);
    }
  }

  /*
   * Helper Functions
   * ------------------------------------------------------------------------ */

  /**
   * Gets the last pressed date from Chrome storage.
   *
   * @returns {Promise<number | null>}
   * Returns the date in seconds of the last time the friend IDs were fetched.
   * Returns null if no date saved in storage (ie.e the extension has not be used yet).
   */
  async function getSavedDate() {
    const dateInStorage = (await getData())[lastPressedDateKey];
    if (dateInStorage) return dateInStorage;

    return null;
  }

  /**
   * Retrieves all data from Chrome local storage.
   */
  async function getData() {
    return new Promise((resolve) => {
      chrome.storage.local.get(null, (data) => {
        resolve(data);
      });
    });
  }

  /**
   * Saves data into Chrome local storage.
   * @param {string} key The data key to lookup/create.
   * @param {*} value The new data payload to store.
   */
  function saveData(key, value) {
    chrome.storage.local.set({[key]: value});
  }

  /**
   * Removes data retrieved from API (and related data) from storage.
   */
  function removePriorRetrievedData() {
    chrome.storage.local.remove(
        [ lastErrorKey, friendsIdsKey, friendsIdsDateKey ]);
  }

  /**
   * Gets the current Date() and converts to seconds.
   */
  function getCurrentTimeInSeconds() {
    return new Date().getTime() / 1000;
  }

  /*
   * Run the app.
   * ------------------------------------------------------------------------ */

  init();
})();
