"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var react_1 = require("react");
var client_1 = require("react-dom/client");
require("./index.css");
var App_jsx_1 = require("./App.jsx");
var OrderContext_1 = require("./contexts/OrderContext");
console.log("App page loaded");
(0, client_1.createRoot)(document.getElementById('root')).render(<react_1.StrictMode>
    <OrderContext_1.OrderProvider>
      <App_jsx_1.default />
    </OrderContext_1.OrderProvider>
  </react_1.StrictMode>);
