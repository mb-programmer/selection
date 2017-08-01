/**
 * --------------------------------------------------------------------------
 * Manishen (v1.0.0): selection.js
 * Licensed under MIT
 * --------------------------------------------------------------------------
 */

var Selection = function ($) {

    /**
     * ------------------------------------------------------------------------
     * Constants
     * ------------------------------------------------------------------------
     */

    var NAME = 'selection';
    var VERSION = '1.0.0';
    var DATA_KEY = 'ma.selection';
    var EVENT_KEY = '.' + DATA_KEY;
    var ITEM_KEY = '.item';
    var BUTTON_CLEAN_KEY = '.btn.clean';
    var RESET_KEY = '.btn.reset';
    var DATA_API_KEY = '.data-api';
    var JQUERY_NO_CONFLICT = $.fn[NAME];
    var ESCAPE_KEYCODE = 27; // KeyboardEvent.which value for Escape (Esc) key
    var SPACE_KEYCODE = 32; // KeyboardEvent.which value for space key
    var TAB_KEYCODE = 9; // KeyboardEvent.which value for tab key
    var ARROW_UP_KEYCODE = 38; // KeyboardEvent.which value for up arrow key
    var ARROW_DOWN_KEYCODE = 40; // KeyboardEvent.which value for down arrow key
    var RIGHT_MOUSE_BUTTON_WHICH = 3; // MouseEvent.which value for the right button (assuming a right-handed mouse)
    var REGEXP_KEYDOWN = new RegExp(ARROW_UP_KEYCODE + '|' + ARROW_DOWN_KEYCODE + '|' + ESCAPE_KEYCODE);

    var Event = {
        HIDE: 'hide' + EVENT_KEY,
        HIDDEN: 'hidden' + EVENT_KEY,
        SHOW: 'show' + EVENT_KEY,
        SHOWN: 'shown' + EVENT_KEY,
        CLICK: 'click' + EVENT_KEY,
        CLICK_ITEM: 'click' + EVENT_KEY + ITEM_KEY,
        CLICK_BTN_CLEAN: 'click' + EVENT_KEY + BUTTON_CLEAN_KEY,
        CLICK_RESET: 'click' + EVENT_KEY + RESET_KEY,
        CLICK_DATA_API: 'click' + EVENT_KEY + DATA_API_KEY,
        KEYDOWN_DATA_API: 'keydown' + EVENT_KEY + DATA_API_KEY,
        KEYUP_DATA_API: 'keyup' + EVENT_KEY + DATA_API_KEY
    };

    var ClassName = {
        DISABLED: 'disabled',
        SHOW: 'show',
        CHECKED: 'checked',
        HIDE: 'hide',
        MIN: 'min',
        MAX: 'max'
    };

    var Selector = {
        CAPTION: '.selection-caption',
        DATA_TOGGLE: '[data-toggle="selection"]',
        CLEAN_BUTTON: '.selection-btn.clean',
        DROPDOWN: '.selection-dropdown',
        INPUT: '.selection-input',
        INPUT_MIN: '.selection-input.min',
        INPUT_MAX: '.selection-input.max',
        LIST: '.selection-list',
        ITEM: '.selection-item',
        HIDDEN_ITEMS: '.selection-item.hide',
        VISIBLE_ITEMS: '.selection-item:not(.hide)',
        CHECKED_ITEMS: '.selection-item.checked',
        ACCEPT_BUTTON: '.selection-action.accept',
        RESET_BUTTON: '.selection-action.reset',
        NEW_BUTTON: '.selection-action.new',
        HIDDEN_VALUES: 'input:hidden.value'
    };

    /**
     * ------------------------------------------------------------------------
     * Class Definition
     * ------------------------------------------------------------------------
     */

    var Selection = function () {
        function Selection(element, config) {
            this._element = element;
            this._config = this._getConfig(config);
            this._parent = Selection._getParentFromElement(element);
            this._dropdown = this._getDropdownElement();
            this._list = this._getListElement();
            this._minItem = null;
            this._maxItem = null;
            this._memory = {
                'min': '',
                'max': '',
                'selectedItems': []
            };
            this._addEventListeners();
            this._setLabel();
            this._toggleClearButton();
        }

        // public

        Selection.prototype.toggle = function toggle() {
            if (this._element.disabled || $(this._element).hasClass(ClassName.DISABLED)) {
                return;
            }

            var parent = Selection._getParentFromElement(this._element);
            var isVisible = this._dropdown.hasClass(ClassName.SHOW);

            Selection._clearLists();
            this._toggleClearButton();
            this._refreshValueInputs();

            if (isVisible) {
                return;
            }

            var relatedTarget = {
                relatedTarget: this._element
            };

            var showEvent = $.Event(Event.SHOW, relatedTarget);

            $(parent).trigger(showEvent);

            if (showEvent.isDefaultPrevented()) {
                return;
            }

            var element = this._element;

            this._element.focus();
            element.setAttribute('aria-expanded', 'true');

            $(this._dropdown).toggleClass(ClassName.SHOW);
            $(parent).toggleClass(ClassName.SHOW).trigger($.Event(Event.SHOWN, relatedTarget));

            if (this._config['type'] && this._config['type'] === 'range') {
                $(this._list).addClass(ClassName.MIN).removeClass(ClassName.MAX);
            }

            var searchInputs = $(this._parent).find(Selector.INPUT);
            if (searchInputs.length) {
                searchInputs[0].focus();
            }

            this._saveMemory();
        };

        Selection.prototype.toggleItem = function selectItem(item) {

            if (this._config['type'] !== undefined) {
                switch (this._config['type']) {
                    case 'single':
                        this._unchekedItems();
                        $(item).toggleClass(ClassName.CHECKED);
                        this.toggle();
                        break;
                    case 'multiple':
                        $(item).toggleClass(ClassName.CHECKED);
                        break;
                    case 'range':
                        this._unchekedItems();
                        $(item).toggleClass(ClassName.CHECKED);

                        if ($(this._list).hasClass(ClassName.MIN)) {
                            $(this._list).addClass(ClassName.MAX).removeClass(ClassName.MIN);
                            var searchInputMax = $(this._parent).find(Selector.INPUT_MAX);
                            if (searchInputMax.length) {
                                searchInputMax[0].focus();
                            }
                            $(this._parent).find(Selector.INPUT_MIN).val(item.getAttribute('data-text'));
                            this._minItem = item;
                        }
                        else if ($(this._list).hasClass(ClassName.MAX)) {
                            $(this._parent).find(Selector.INPUT_MAX).val(item.getAttribute('data-text'));
                            this._maxItem = item;
                            this.toggle();
                        }
                        break;
                }
            }

            this._toggleClearButton();
            this._setCaption();
        };

        Selection.prototype.dispose = function dispose() {
            $.removeData(this._element, DATA_KEY);
            $(this._element).off(EVENT_KEY);
            this._element = null;
            this._list = null;
        };

        Selection.prototype.reset = function reset() {
            if (this._config['type'] === undefined) {
                return;
            }

            switch (this._config['type']) {
                case "range":
                    var inputMin = $(this._parent).find(Selector.INPUT_MIN);
                    var inputMax = $(this._parent).find(Selector.INPUT_MAX);

                    inputMin.val(this._memory.min);
                    inputMax.val(this._memory.max);

                    this._minItem = null;
                    this._maxItem = null;

                    var items = $.makeArray($(this._list).find(Selector.ITEM));
                    for (var i in items) {
                        if (items[i].getAttribute('data-text') === inputMin.val()) {
                            this._minItem = items[i];
                        }
                        if (items[i].getAttribute('data-text') === inputMax.val()) {
                            this._maxItem = items[i];
                        }
                    }
                    break;
                case "multiple":
                case "single":
                    this._unchekedItems();
                    $(this._memory.selectedItems).addClass(ClassName.CHECKED);
                    break;
            }

            this.toggle();
        };

        // private

        Selection.prototype._addEventListeners = function _addEventListeners() {
            var _this = this;

            $(this._element).on(Event.CLICK, function (event) {
                event.stopPropagation();
                event.preventDefault();
                _this.toggle();
            });

            $(this._element).on(Event.CLICK_BTN_CLEAN, Selector.CLEAN_BUTTON, function (event) {
                event.preventDefault();
                event.stopPropagation();
                _this._unchekedItems();
                _this._setCaption();
                _this._toggleClearButton();
                _this._setLabel();
                if (_this._dropdown.hasClass(ClassName.SHOW)) {
                    _this.toggle();
                }
                $(_this._parent).find(Selector.INPUT).val('');
                _this._refreshValueInputs();
            });

            $(this._parent).on('keyup', Selector.INPUT, function (event) {
                if (_this._config['type'] && _this._config['type'] === "range") {
                    return;
                }
                var items = $.makeArray(_this._list.find(Selector.ITEM));
                var term = '';
                var pattern = '';
                for (var i in items) {
                    term = items[i].getAttribute('data-text').replace(/[ ]*/g, '');
                    pattern = String(this.value);
                    if ((new RegExp(pattern.replace(/[ ]*/g, ''), "gi")).test(term)) {
                        $(items[i]).removeClass(ClassName.HIDE)
                    }
                    else {
                        $(items[i]).addClass(ClassName.HIDE)
                    }
                }

                var visibleItems = $(Selection._getParentFromElement(_this._element)).find(Selector.VISIBLE_ITEMS);
                if (visibleItems.length === 0) {
                    $(_this._parent).find(Selector.NEW_BUTTON).addClass(ClassName.SHOW);
                }
                else {
                    $(_this._parent).find(Selector.NEW_BUTTON).removeClass(ClassName.SHOW);
                }
            });

            $(this._parent).on(Event.CLICK_ITEM, Selector.ITEM, function (event) {
                event.preventDefault();
                event.stopPropagation();
                _this.toggleItem(event.target);
            });

            $(this._parent).on('focus', Selector.INPUT, function (event) {
                event.preventDefault();
                event.stopPropagation();
                if (_this._config['type'] === undefined) {
                    return;
                }

                switch (_this._config['type']) {
                    case "range":
                        if ($(event.target).hasClass(ClassName.MIN)) {
                            $(_this._parent).find(Selector.LIST).addClass(ClassName.MIN).removeClass(ClassName.MAX);
                            _this._unchekedItems();
                            if (_this._minItem && _this._minItem.getAttribute('data-text') == event.target.value) {
                                $(_this._minItem).toggleClass(ClassName.CHECKED);
                            }
                        }
                        if ($(event.target).hasClass(ClassName.MAX)) {
                            $(_this._parent).find(Selector.LIST).addClass(ClassName.MAX).removeClass(ClassName.MIN);
                            _this._unchekedItems();
                            if (_this._maxItem && _this._maxItem.getAttribute('data-text') == event.target.value) {
                                $(_this._maxItem).toggleClass(ClassName.CHECKED);
                            }
                        }
                        break;
                }
            });

            $(this._parent).on(Event.CLICK_RESET, Selector.RESET_BUTTON, function (event) {
                event.preventDefault();
                event.stopPropagation();
                _this.reset();
            });
        };

        Selection.prototype._getConfig = function _getConfig(config) {
            var elementData = $(this._element).data();
            if (elementData.placement !== undefined) {
                elementData.placement = AttachmentMap[elementData.placement.toUpperCase()];
            }

            config = $.extend({}, this.constructor.Default, $(this._element).data(), config);

            return config;
        };

        Selection.prototype._getDropdownElement = function _getDropdownElement() {
            if (!this._dropdown) {
                var parent = Selection._getParentFromElement(this._element);
                this._dropdown = $(parent).children(Selector.DROPDOWN);
            }
            return this._dropdown;
        };

        Selection.prototype._getListElement = function _getListElement() {
            if (!this._list) {
                var parent = Selection._getParentFromElement(this._element);
                this._list = $(parent).find(Selector.LIST);
            }
            return this._list;
        };

        Selection.prototype._getCleanButtonElement = function _getCleanButtonElement() {
            var parent = this._parent;
            var cleanButton = $(parent).find(Selector.CLEAN_BUTTON);
            if (cleanButton.length > 0) {
                return cleanButton[0];
            }

            return undefined;
        };

        Selection.prototype._unchekedItems = function _uncheckedItems() {
            var items = $(this._list).children(Selector.CHECKED_ITEMS);
            for (var i = 0; i < items.length; i++) {
                $(items[i]).removeClass(ClassName.CHECKED);
            }
        };

        Selection.prototype._setCaption = function _setCaption() {
            var checkedItems = $(this._list).find(Selector.CHECKED_ITEMS);
            var $caption = $(this._parent).find(Selector.CAPTION).html('');

            switch (this._element.getAttribute('data-type')) {
                case 'single':
                    if (checkedItems.length) {
                        $caption.html('<span class="selection-label">' + this._config['label'] + '</span>');
                        $caption.append('<span class="selection-tag">' + checkedItems[0].getAttribute('data-text') + '</span>');
                    }
                    else {
                        this._setLabel();
                    }
                    break;
                case 'multiple':
                    if (checkedItems.length) {
                        var limit = 3;
                        $caption.html('<span class="selection-label">' + this._config['label'] + '</span>');
                        for (var i = 0; i < checkedItems.length && i < limit; i++) {
                            $caption.append('<span class="selection-tag">' + checkedItems[i].getAttribute('data-text') + '</span>');
                        }
                        if (checkedItems.length > limit) {
                            $caption.append('<span class="selection-tag number">' + (checkedItems.length - limit) + '</span>');
                        }
                    }
                    else {
                        this._setLabel();
                    }

                    break;
                case 'range':
                    var valueMin = $(this._parent).find(Selector.INPUT_MIN);
                    var valueMax = $(this._parent).find(Selector.INPUT_MAX);
                    valueMin = valueMin.length ? valueMin.val() : undefined;
                    valueMax = valueMax.length ? valueMax.val() : undefined;

                    this._toggleClearButton();

                    $caption.html('<span class="selection-label">' + this._config['label'] + '</span>');

                    if (valueMin) {
                        if (!valueMax) {
                            $caption.append('<span class="selection-tag">از</span>');
                        }
                        $caption.append($('<span class="selection-tag">').html(valueMin));
                    }
                    if (valueMax) {
                        $caption.append('<span class="selection-tag">تا</span>');
                        $caption.append($('<span class="selection-tag">').html(valueMax));
                    }

                    if (!valueMin && !valueMax) {
                        this._setLabel();
                        this._unchekedItems();
                        this._toggleClearButton();
                    }
                    break;
            }
        };

        Selection.prototype._setLabel = function _setLabel() {
            if (this._config['label']) {
                $(this._parent).find(Selector.CAPTION).html(this._config['label']);
            }
        };

        Selection.prototype._refreshValueInputs = function _refreshValueInputs() {
            $(this._parent).find(Selector.HIDDEN_VALUES).remove();

            if (this._config['type'] === undefined) {
                return;
            }

            switch (this._config['type']) {
                case "range":
                    var inputMin = $(this._parent).find(Selector.INPUT_MIN);
                    var inputMax = $(this._parent).find(Selector.INPUT_MAX);

                    if (inputMin.val()) {
                        $(this._parent).append(
                            $('<input type="hidden" class="value">')
                                .attr('name', this._element.getAttribute('data-name') + '_min')
                                .val($(this._parent).find(Selector.INPUT_MIN).val())
                        );
                    }

                    if (inputMax.val()) {
                        $(this._parent).append(
                            $('<input type="hidden" class="value">')
                                .attr('name', this._element.getAttribute('data-name') + '_max')
                                .val($(this._parent).find(Selector.INPUT_MAX).val())
                        );
                    }
                    break;
                case "multiple":
                case "single":
                    var checkedItems = $.makeArray($(this._list).find(Selector.CHECKED_ITEMS));
                    if (checkedItems.length) {
                        for (var i in checkedItems) {
                            $(this._parent).append(
                                $('<input type="hidden" class="value">')
                                    .attr('name', this._element.getAttribute('data-name'))
                                    .val(checkedItems[i].getAttribute('data-value'))
                            );
                        }
                    }
                    break;
            }
        };

        Selection.prototype._toggleClearButton = function _toggleClearButton() {
            if (this._config['cleanable'] === undefined || this._config['cleanable'] === false) {
                return;
            }

            if ($(this._list).find(Selector.CHECKED_ITEMS).length > 0) {
                $(this._getCleanButtonElement()).addClass(ClassName.SHOW);
                return;
            }

            if ($(this._parent).find(Selector.INPUT).val()) {
                $(this._getCleanButtonElement()).addClass(ClassName.SHOW);
                return;
            }

            $(this._getCleanButtonElement()).removeClass(ClassName.SHOW);
        };

        Selection.prototype._saveMemory = function _saveMemory() {
            if (this._config['type'] === undefined) {
                return;
            }

            switch (this._config['type']) {
                case "range":
                    var inputMin = $(this._parent).find(Selector.INPUT_MIN);
                    var inputMax = $(this._parent).find(Selector.INPUT_MAX);

                    this._memory.min = inputMin ? inputMin.val() : null;
                    this._memory.max = inputMax ? inputMax.val() : null;
                    break;
                case "multiple":
                case "single":
                    this._memory.selectedItems = $.makeArray($(this._list).find(Selector.CHECKED_ITEMS));
                    break;
            }
        };

        // static

        Selection._jQueryInterface = function _jQueryInterface(config) {
            return this.each(function () {
                var data = $(this).data(DATA_KEY);
                var _config = (typeof config === 'undefined' ? 'undefined' : typeof(config)) === 'object' ? config : null;

                if (!data) {
                    data = new Selection(this, _config);
                    $(this).data(DATA_KEY, data);
                }

                if (typeof config === 'string') {
                    if (data[config] === undefined) {
                        throw new Error('No method named "' + config + '"');
                    }
                    data[config]();
                }
            });
        };

        Selection._clearLists = function _clearLists(event) {
            if (event && (event.which === RIGHT_MOUSE_BUTTON_WHICH || event.type === 'keyup' && event.which !== TAB_KEYCODE)) {
                return;
            }

            var toggles = $.makeArray($(Selector.DATA_TOGGLE));
            for (var i = 0; i < toggles.length; i++) {
                var parent = Selection._getParentFromElement(toggles[i]);
                var context = $(toggles[i]).data(DATA_KEY);
                var relatedTarget = {
                    relatedTarget: toggles[i]
                };

                if (!context) {
                    continue;
                }

                var dropdown = context._dropdown;

                if (!$(parent).hasClass(ClassName.SHOW)) {
                    continue;
                }

                if (event && (event.type === 'click' && /input|textarea/i.test(event.target.tagName) || event.type === 'keyup' && event.which === TAB_KEYCODE) && $.contains(parent, event.target)) {
                    continue;
                }

                var hideEvent = $.Event(Event.HIDE, relatedTarget);
                $(parent).trigger(hideEvent);
                if (hideEvent.isDefaultPrevented()) {
                    continue;
                }

                // if this is a touch-enabled device we remove the extra
                // empty mouseover listeners we added for iOS support
                if ('ontouchstart' in document.documentElement) {
                    $('body').children().off('mouseover', null, $.noop);
                }

                toggles[i].setAttribute('aria-expanded', 'false');

                $(dropdown).removeClass(ClassName.SHOW);
                $(parent).removeClass(ClassName.SHOW).trigger($.Event(Event.HIDDEN, relatedTarget));
                Selection._jQueryInterface.call($(toggles[i]), '_refreshValueInputs');
                Selection._jQueryInterface.call($(toggles[i]), '_setCaption');
            }
        };

        Selection._getParentFromElement = function _getParentFromElement(element) {
            return element.parentNode;
        };

        Selection._dataApiKeydownHandler = function _dataApiKeydownHandler(event) {
            if (!REGEXP_KEYDOWN.test(event.which) || /button/i.test(event.target.tagName) && event.which === SPACE_KEYCODE || /input|textarea/i.test(event.target.tagName)) {
                return;
            }

            event.preventDefault();
            event.stopPropagation();

            if (this.disabled || $(this).hasClass(ClassName.DISABLED)) {
                return;
            }

            var parent = Selection._getParentFromElement(this);
            var isActive = $(parent).hasClass(ClassName.SHOW);

            if (!isActive && (event.which !== ESCAPE_KEYCODE || event.which !== SPACE_KEYCODE) || isActive && (event.which === ESCAPE_KEYCODE || event.which === SPACE_KEYCODE)) {

                if (event.which === ESCAPE_KEYCODE) {
                    var toggle = $(parent).find(Selector.DATA_TOGGLE)[0];
                    $(toggle).trigger('focus');
                }

                $(this).trigger('click');
                return;
            }

            var items = $(parent).find(Selector.VISIBLE_ITEMS).get();

            if (!items.length) {
                return;
            }

            var index = items.indexOf(event.target);

            if (event.which === ARROW_UP_KEYCODE && index > 0) {
                // up
                index--;
            }

            if (event.which === ARROW_DOWN_KEYCODE && index < items.length - 1) {
                // down
                index++;
            }

            if (index < 0) {
                index = 0;
            }

            items[index].focus();
        };

        return Selection;
    }();

    /**
     * ------------------------------------------------------------------------
     * Data Api implementation
     * ------------------------------------------------------------------------
     */

    $(document).on(Event.KEYDOWN_DATA_API, Selector.DATA_TOGGLE, Selection._dataApiKeydownHandler)
        .on(Event.KEYDOWN_DATA_API, Selector.DROPDOWN, Selection._dataApiKeydownHandler)
        .on(Event.CLICK_DATA_API + ' ' + Event.KEYUP_DATA_API, Selection._clearLists)
        .on(Event.CLICK_DATA_API, Selector.DATA_TOGGLE, function (event) {
            event.preventDefault();
            event.stopPropagation();
            Selection._jQueryInterface.call($(this), 'toggle');
        });

    /**
     * ------------------------------------------------------------------------
     * jQuery
     * ------------------------------------------------------------------------
     */

    $.fn[NAME] = Selection._jQueryInterface;
    $.fn[NAME].Constructor = Selection;
    $.fn[NAME].noConflict = function () {
        $.fn[NAME] = JQUERY_NO_CONFLICT;
        return Selection._jQueryInterface;
    };

    return Selection;
}(jQuery);