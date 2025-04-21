"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.usePersistForm = void 0;
var react_1 = require("react");
var STORAGE_KEY = "kitfix-schedule-service";
var usePersistForm = function (form) {
    (0, react_1.useEffect)(function () {
        var subscription = form.watch(function (values) {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(values));
        });
        return function () { return subscription.unsubscribe(); };
    }, [form]);
};
exports.usePersistForm = usePersistForm;
