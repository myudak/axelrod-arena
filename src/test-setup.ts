// jsdom does not implement scrolling; the router's ScrollToTop calls it on every navigation.
window.scrollTo = () => {};
