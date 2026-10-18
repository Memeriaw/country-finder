// 1. Grab the elements we need
const form = document.querySelector("#search-form");
const input = document.querySelector("#search-input");
const message = document.querySelector("#message");
const results = document.querySelector("#results");

// 2. Load country details and population data
const countryDataUrl = "https://raw.githubusercontent.com/mledoze/countries/master/countries.json";
const populationDataUrl = "https://api.worldbank.org/v2/country/all/indicator/SP.POP.TOTL?format=json&per_page=20000&mrnev=1";
let countryDataPromise;

async function fetchJson(url) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Request failed: ${response.status}`);
  return response.json();
}

async function loadCountryData() {
  if (!countryDataPromise) {
    countryDataPromise = Promise.all([
      fetchJson(countryDataUrl),
      fetchJson(populationDataUrl)
    ]).then(([countries, populationResponse]) => {
      if (!Array.isArray(countries)) throw new Error("Invalid country data response");
      if (!Array.isArray(populationResponse?.[1])) {
        throw new Error("Invalid population data response");
      }

      const populations = new Map(
        populationResponse[1].map(({ countryiso3code, value }) => [countryiso3code, value])
      );

      return countries.map((country) => ({
        ...country,
        population: populations.get(country.cca3)
      }));
    }).catch((error) => {
      countryDataPromise = undefined;
      throw error;
    });
  }

  return countryDataPromise;
}

async function searchCountries(name) {
  const countries = await loadCountryData();
  const query = name.toLocaleLowerCase();
  return countries.filter(({ name: countryName }) =>
    [countryName.common, countryName.official]
      .some((value) => value.toLocaleLowerCase().includes(query))
  );
}

// 3. Turn data into HTML
function renderCountries(countries) {
  results.replaceChildren(...countries.map(({ name, cca2, capital, population, region }) => {
    const card = document.createElement("article");
    card.className = "card";

    const flag = document.createElement("img");
    flag.src = `https://flagcdn.com/w640/${cca2.toLowerCase()}.png`;
    flag.alt = `Flag of ${name.common}`;

    const details = document.createElement("div");
    const heading = document.createElement("h2");
    heading.textContent = name.common;
    details.append(heading);

    [
      `Capital: ${capital?.[0] ?? "N/A"}`,
      `Region: ${region || "N/A"}`,
      `Population: ${population == null ? "N/A" : population.toLocaleString()}`
    ].forEach((text) => {
      const paragraph = document.createElement("p");
      paragraph.textContent = text;
      details.append(paragraph);
    });

    card.append(flag, details);
    return card;
  }));
}

// 4. Handle the form
form.addEventListener("submit", async (event) => {
  event.preventDefault();               // stop the page from reloading

  const name = input.value.trim();
  if (!name) return;

  message.textContent = "Loading...";
  results.innerHTML = "";

  try {
    const countries = await searchCountries(name);

    if (countries.length === 0) {
      message.textContent = `No country found for "${name}".`;
      return;
    }

    message.textContent = `${countries.length} result(s)`;
    renderCountries(countries);
  } catch (error) {
    message.textContent = "Something went wrong. Check your connection and try again.";
    console.error(error);
  }
});