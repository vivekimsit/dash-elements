/**
 * Tab panels are a pattern to limit visible content by separating
 * it into multiple panels. Only one panel is visible at a time, while
 * _all_ corresponding tabs are always visible. To switch from one panel
 * to another, the corresponding tab has to be selected.
 *
 * Invisible panels are have the `aria-hidden` attribute.
 * By either clicking or by using the arrow keys the user changes the
 * selection.
 *
 * If JavaScript is disabled, all panels are shown interleaved with the
 * respective tabs. The tabs now function as headings.
 */
(function() {
  /**
   * Define keycodes to help with handling keyboard events.
   */
  const KEYCODE = {
    DOWN: 40,
    LEFT: 37,
    RIGHT: 39,
    UP: 38,
    HOME: 36,
    END: 35,
  };

  /**
   * `TabList` is a container element for tabs and panels.
   *
   * Children of the `TabList` with `role=tab` are considered tabs. The
   * associated panel that they control is specified by using that panel’s ID
   * for the `aria-controls` attribute. The selected tab has the `aria-selected`
   * attribute.
   *
   * Children of the `TabList` with `role=tabpanel` attribute are panels.
   */
  class TabList extends HTMLElement {

    /**
     * The constructor hooks up the event handlers. Since only events on the
     * element itself are handled, this can take place in the constructor.
     */
    constructor() {
      super();
    }

    /**
     * `connectedCallback` groups tabs and panels by reordering and makes sure
     * exactly one tab is active.
     */
    connectedCallback() {
      // The element needs to do some manual input event handling to allow
      // switching with arrow keys and Home/End.
      this.addEventListener('keydown', this._onKeyDown);
      this.addEventListener('click', this._onClick);

      this.setAttribute('role', 'tablist');
      // Acquire all tabs and panels inside the element
      const tabs = this._allTabs();
      const panels = this._allPanels();
      // If there are no tabs, there is no way to switch between panels. Abort.
      if (!tabs.length) return;

      // For progressive enhancement, the markup should alternate between tabs
      // and panels. If JavaScript is disabled, all panels are
      // visible with their respective tab right above them.
      // If JavaScript is enabled, the element reorders all children into
      // their two groups. First all the tabs, then all the panels.
      // Calling `appendChild` on an already inserted element _moves_ the
      // element to the last child position.
      tabs.forEach(tab => this.appendChild(tab));
      panels.forEach(panel => this.appendChild(panel));

      // Give each panel a `aria-labelledby` attribute that refers to the tab
      // that controls it.
      tabs.forEach(tab => {
        if (tab.id)
          this._panelForTab(tab).setAttribute('aria-labelledby', tab.id);
        else
          console.warn(`The tab that controls panel #${panelId} has no id, ` +
            `but needs one for ARIA.`);
      });

      // The element checks if any of the tabs have been marked as selected. If
      // not, the first tab is now selected.
      const selectedTab =
        tabs.find(tab =>
          tab.getAttribute('aria-selected') === 'true') || tabs[0];

      // Next, we switch to the selected tab. `selectTab` takes care of marking
      // all other tabs as deselected and hiding all other panels.
      this._selectTab(selectedTab);
    }

    /**
     * `_allPanels` returns all the panels in the tab panel. This function could
     * memoize the result if the DOM queries ever become a performance issue.
     * The downside of memoization is that dynamically added tabs and panels
     * will not be handled.
     * This is a function and not getter, because a getter implies that it is
     * cheap to read.
     */
    _allPanels() {
      return Array.from(this.querySelectorAll('[role=tabpanel]'));
    }
    /**
     * `_allTabs` returns all the tabs in the tab panel.
     */
    _allTabs() {
      return Array.from(this.querySelectorAll('[role=tab]'));
    }

    /**
     * `_panelForTab` returns the panel that the given tab controls.
     */
    _panelForTab(tab) {
      const panelId = tab.getAttribute('aria-controls');
      return this._allPanels().find(panel => panel.id === panelId);
    }

    /**
     * `_prevTab` gets the tab that comes before the currently selected one,
     * wrapping around when reaching the first one.
     */
    _prevTab() {
      const tabs = this._allTabs();
      // Use `findIndex` to find the index of the currently
      // selected element and subtracts one to get the index of the previous
      // element.
      let newIdx =
        tabs.findIndex(tab =>
          tab.getAttribute('aria-selected') === 'true') - 1;
      // Add `tabs.length` to make sure the index is a positive number
      // and get the modulus to wrap around if necessary.
      return tabs[(newIdx + tabs.length) % tabs.length];
    }

    /**
     * `_nextTab` gets the tab that comes after the currently selected one,
     * wrapping around when reaching the last tab.
     */
    _nextTab() {
      const tabs = this._allTabs();
      let newIdx =
        tabs.findIndex(tab =>
          tab.getAttribute('aria-selected') === 'true') + 1;
      return tabs[newIdx % tabs.length];
    }

    /**
     * `reset` marks all tabs as deselected and hides all the panels.
     */
    reset() {
      const tabs = this._allTabs();
      const panels = this._allPanels();

      tabs.forEach(tab => {
        tab.tabIndex = -1;
        tab.setAttribute('aria-selected', 'false');
      });

      panels.forEach(panel => {
        panel.setAttribute('aria-hidden', 'true');
      });
    }

    /**
     * `disconnectedCallback` removes the event listeners that
     * `connectedCallback` added.
     */
    disconnectedCallback() {
      this.removeEventListener('keydown', this._onKeyDown);
      this.removeEventListener('click', this._onClick);
    }

    /**
     * `_selectTab` marks the given tab as selected.
     * Additionally, it unhides the panel corresponding to the given tab.
     */
    _selectTab(newTab) {
      // Deselect all tabs and hide all panels.
      this.reset();

      const newPanel = this._panelForTab(newTab);
      // If that panel doesn’t exist, abort.
      if (!newPanel) throw new Error(`No panel with id ${newPanelId}`);

      // Unhide the panel and mark the tab as active.
      newPanel.setAttribute('aria-hidden', 'false');

      newTab.setAttribute('aria-selected', 'true');
      newTab.tabIndex = 0;
      newTab.focus();
    }

    /**
     * `_onKeyDown` handles key presses inside the tab panel.
     */
    _onKeyDown(event) {
      // The browser might have some native functionality bound to the arrow
      // keys. Prevent the browser from taking any actions.
      event.preventDefault();
      // If the keypress did not originate from a tab element itself,
      // it was a keypress inside the a panel or on empty space. Nothing to do.
      if (event.target.getAttribute('role') !== 'tab') return;
      // Don’t handle modifier shortcuts typically used by assistive technology.
      if (event.altKey) return;

      let newTab;

      // The switch-case will determine which tab should be marked as active
      // depending on the key that was pressed.
      switch (event.keyCode) {
        // When up or left is pressed, the previous tab is selected. If the
        // first tab is reached, the element loops around to the last tab.
        case KEYCODE.LEFT:
        case KEYCODE.UP:
          newTab = this._prevTab();
          break;

        // Same goes for right and down, but in the other direction.
        case KEYCODE.RIGHT:
        case KEYCODE.DOWN:
          newTab = this._nextTab();
          break;

        // The home button always selects the first tab.
        case KEYCODE.HOME:
          newTab = this._allTabs()[0];
          break;

        // And end always selects the last one.
        case KEYCODE.END:
          const tabs = this._allTabs();
          newTab = tabs[tabs.length - 1];
          break;
        // Any other key press is ignored and passed back to the browser.
        default:
          return;
      }
      // Select the new tab, that has been determined in the switch-case.
      this._selectTab(newTab);
    }

    /**
     * `_onClick` handles clicks inside the tab panel.
     */
    _onClick(event) {
      // If the click was not targeted on a tab element itself,
      // it was a click inside the a panel or on empty space. Nothing to do.
      if (!event.target.getAttribute('role', 'tab')) return;
      // If it was on a tab element, though, select that tab.
      this._selectTab(event.target);
    }
  }

  window.customElements.define('dash-tablist', TabList);
})();
