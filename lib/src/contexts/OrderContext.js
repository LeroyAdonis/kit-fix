"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.useOrderContext = exports.OrderProvider = void 0;
// context/OrderContext.tsx
var react_1 = require("react");
var OrderContext = (0, react_1.createContext)(undefined);
var OrderProvider = function (_a) {
    var children = _a.children;
    var _b = (0, react_1.useState)([]), uploadedImages = _b[0], setUploadedImages = _b[1];
    var _c = (0, react_1.useState)(""), orderId = _c[0], setOrderId = _c[1];
    var _d = (0, react_1.useState)(""), repairType = _d[0], setRepairType = _d[1];
    var _e = (0, react_1.useState)(""), notes = _e[0], setNotes = _e[1];
    return (<OrderContext.Provider value={{
            uploadedImages: uploadedImages,
            setUploadedImages: setUploadedImages,
            orderId: orderId,
            setOrderId: setOrderId,
            repairType: repairType,
            setRepairType: setRepairType,
            notes: notes,
            setNotes: setNotes,
        }}>
            {children}
        </OrderContext.Provider>);
};
exports.OrderProvider = OrderProvider;
var useOrderContext = function () {
    var context = (0, react_1.useContext)(OrderContext);
    if (!context) {
        throw new Error("useOrderContext must be used within an OrderProvider");
    }
    return context;
};
exports.useOrderContext = useOrderContext;
