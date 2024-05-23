const searchInput = document.querySelector('.search-input');
const favoritesContainer = document.querySelector('.benefit-sites.favorites');
const resultsContainer = document.querySelector('.benefit-sites.results');
const favorites = JSON.parse(localStorage.getItem('favorites') ?? '[]');


function initialize() {
  customElements.define('benefit-site', BenefitSiteElement);
  searchInput.addEventListener('input', handleSearchInput);
  renderFavorites();
}


function handleSearchInput() {
  const query = searchInput.value.trim();
  if ( ! query) {
    renderFavorites();
    resultsContainer.replaceChildren();
  }
  debouncedSearch(query);
}


const debouncedSearch = debounce(() => performSearch(searchInput.value), 3000);

async function performSearch(query) {
  if ( ! query) {
    return;
  }
  const response = await fetch('https://corsproxy.io/?https://services.epassi.fi/api/discovery/v1/nearby', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      "country": "Finland",
      "area_limit": null,
      "query": query,
      "image_requirements": [{"image_type": "HORIZONTAL", "min_width": 600}],
      "site_type": "lunch",
      "page": 0,
      "categories": [],
      "sort_order": "RELEVANCE",
    }),
  });
  const data = await response.json();
  handleSearchResult(data.response);
}


function handleSearchResult(result) {
  resultsContainer.replaceChildren();
  for (const benefitSite of result.sites) {
    const benefitSiteElement = new BenefitSiteElement(benefitSite);
    resultsContainer.appendChild(benefitSiteElement);
  }
  for (let i = 0; i < 10; i++) {
    const benefitSiteElement = new BenefitSiteElement();
    resultsContainer.appendChild(benefitSiteElement);
  }
  favoritesContainer.style.display = 'none';
  resultsContainer.style.display = '';
  resultsContainer.scrollTop = resultsContainer.scrollHeight;
}


function renderFavorites() {
  favoritesContainer.replaceChildren();
  for (const favorite of favorites) {
    const benefitSiteElement = BenefitSiteElement.unserialize(favorite);
    benefitSiteElement.classList.add('favorited');
    favoritesContainer.appendChild(benefitSiteElement);
  }
  for (let i = 0; i < 10; i++) {
    const benefitSiteElement = new BenefitSiteElement();
    favoritesContainer.appendChild(benefitSiteElement);
  }
  resultsContainer.style.display = 'none';
  favoritesContainer.style.display = '';
}


class BenefitSiteElement extends HTMLElement {
  template = document.querySelector('#benefit-site-template');

  constructor(benefitSite) {
    super();
    this.appendChild(this.template.content.cloneNode(true));
    this.benefitSite = benefitSite;
    this.imageElement = this.querySelector('.site-image');
    this.nameElement = this.querySelector('.site-name');
    this.categoriesElement = this.querySelector('.site-categories');
    this.favoriteButton = this.querySelector('.favorite-button');
    this.siteLink = this.querySelector('.site-link');
    if (benefitSite === undefined) {
      this.classList.add('placeholder');
      return;
    }
    this.setAttribute('data-id', benefitSite.id);
    this.nameElement.textContent = benefitSite.name;
    this.categoriesElement.textContent = benefitSite.categories.map(category => category.text).join(', ');
    this.siteLink.href = `fi.epassi://merchantinfo/${benefitSite.id}`;
    const imageUrl = benefitSite.image_sets[0]?.images[0]?.url ?? '';
    this.imageElement.src = imageUrl;
    if ( ! imageUrl) {
      this.classList.add('no-image');
    }
    const isFavorite = favorites.some(favorite => favorite.id === benefitSite.id);
    if (isFavorite) {
      this.classList.add('favorited');
    }
  }
  connectedCallback() {
    this.favoriteButton.addEventListener('click', () => this.toggleFavorite());
  }
  serialize() {
    if ( ! this.benefitSite) {
      return null;
    }
    const {id, name, categories, image_sets} = this.benefitSite;
    return {id, name, categories, image_sets};
  }
  static unserialize(data) {
    if (data === null) {
      return new BenefitSiteElement();
    }
    return new BenefitSiteElement(data);
  }
  toggleFavorite() {
    for (const favorite of favorites) {
      if (favorite.id === this.benefitSite.id) {
        // Already in favorites. Remove from favorites.
        favorites.splice(favorites.indexOf(favorite), 1);
        this.classList.remove('favorited');
        persistFavorites();
        return;
      }
    }
    // Add to favorites.
    const serialized = this.serialize();
    favorites.push(serialized);
    if (favoritesContainer.querySelector(`[data-id="${this.benefitSite.id}"]`) === null) {
      favoritesContainer.prepend(BenefitSiteElement.unserialize(serialized));
    }
    this.classList.add('favorited');
    persistFavorites();
  }
}


function persistFavorites() {
  localStorage.setItem('favorites', JSON.stringify(favorites));
}


// Utils

function debounce(func, waitMilliseconds) {
  let timeout;
  return function debouncedFunc(...args) {
    clearTimeout(timeout);
    timeout = setTimeout(() => {
      func.apply(this, args);
    }, waitMilliseconds);
  };
}


// Init

initialize();
