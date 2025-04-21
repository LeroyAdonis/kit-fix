"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var react_1 = require("react");
var react_router_dom_1 = require("react-router-dom");
var AuthLayout = function () {
    return (<div>
            {/* optional header or wrapper UI */}
            <react_router_dom_1.Outlet />
            {/* optional footer or layout components */}
        </div>);
};
exports.default = AuthLayout;
