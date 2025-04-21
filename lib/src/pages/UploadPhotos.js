"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
var __spreadArray = (this && this.__spreadArray) || function (to, from, pack) {
    if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
        if (ar || !(i in from)) {
            if (!ar) ar = Array.prototype.slice.call(from, 0, i);
            ar[i] = from[i];
        }
    }
    return to.concat(ar || Array.prototype.slice.call(from));
};
Object.defineProperty(exports, "__esModule", { value: true });
var react_1 = require("react");
var react_router_dom_1 = require("react-router-dom");
var button_1 = require("@/components/ui/button");
var input_1 = require("@/components/ui/input");
var sonner_1 = require("sonner");
var Header_1 = require("@/components/Header");
var Footer_1 = require("@/components/Footer");
var lucide_react_1 = require("lucide-react");
var storage_1 = require("firebase/storage");
var firebaseConfig_1 = require("@/firebaseConfig");
var firestore_1 = require("firebase/firestore");
var auth_1 = require("react-firebase-hooks/auth");
var firebaseConfig_2 = require("@/firebaseConfig");
var OrderContext_1 = require("@/contexts/OrderContext");
var storage = (0, storage_1.getStorage)(firebaseConfig_1.default);
var UploadPhotos = function () {
    (0, OrderContext_1.useOrderContext)();
    var navigate = (0, react_router_dom_1.useNavigate)();
    var _a = (0, react_1.useState)([]), photos = _a[0], setPhotos = _a[1];
    var _b = (0, react_1.useState)([]), previews = _b[0], setPreviews = _b[1];
    var _c = (0, react_1.useState)(false), isDragging = _c[0], setIsDragging = _c[1];
    var _d = (0, react_1.useState)(0), uploadProgress = _d[0], setUploadProgress = _d[1];
    var _e = (0, react_1.useState)(false), uploading = _e[0], setUploading = _e[1];
    var db = (0, firestore_1.getFirestore)(firebaseConfig_1.default);
    var user = (0, auth_1.useAuthState)(firebaseConfig_2.auth)[0];
    // Handle file input change
    var handleFileChange = function (e) {
        if (e.target.files && e.target.files.length > 0) {
            var newFiles = Array.from(e.target.files);
            addPhotos(newFiles);
        }
    };
    // Add photos to state
    var addPhotos = function (files) {
        // Only accept image files
        var imageFiles = files.filter(function (file) { return file.type.startsWith('image/'); });
        if (imageFiles.length === 0) {
            sonner_1.toast.error('Please upload image files only');
            return;
        }
        if (photos.length + imageFiles.length > 5) {
            sonner_1.toast.error('You can upload a maximum of 5 photos');
            return;
        }
        // Create preview URLs
        var newPreviews = imageFiles.map(function (file) { return URL.createObjectURL(file); });
        setPhotos(__spreadArray(__spreadArray([], photos, true), imageFiles, true));
        setPreviews(__spreadArray(__spreadArray([], previews, true), newPreviews, true));
        sonner_1.toast.success("".concat(imageFiles.length, " photo").concat(imageFiles.length > 1 ? 's' : '', " added"));
    };
    // Remove photo from state
    var removePhoto = function (index) {
        // Revoke the object URL to avoid memory leaks
        URL.revokeObjectURL(previews[index]);
        var newPhotos = __spreadArray([], photos, true);
        var newPreviews = __spreadArray([], previews, true);
        newPhotos.splice(index, 1);
        newPreviews.splice(index, 1);
        setPhotos(newPhotos);
        setPreviews(newPreviews);
    };
    // Handle drag events
    var handleDrag = function (e) {
        e.preventDefault();
        e.stopPropagation();
        if (e.type === 'dragenter' || e.type === 'dragover') {
            setIsDragging(true);
        }
        else if (e.type === 'dragleave') {
            setIsDragging(false);
        }
    };
    // Handle drop event
    var handleDrop = function (e) {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);
        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
            var droppedFiles = Array.from(e.dataTransfer.files);
            addPhotos(droppedFiles);
        }
    };
    // Handle form submission
    var handleSubmit = function (e) { return __awaiter(void 0, void 0, void 0, function () {
        var downloadURLs_1, orderRef_1, error_1;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    e.preventDefault();
                    if (photos.length === 0) {
                        sonner_1.toast.error('Please upload at least one photo of your jersey');
                        return [2 /*return*/];
                    }
                    setUploading(true);
                    _a.label = 1;
                case 1:
                    _a.trys.push([1, 4, 5, 6]);
                    return [4 /*yield*/, Promise.all(photos.map(function (photo) {
                            var uniqueName = "".concat(user === null || user === void 0 ? void 0 : user.uid, "_").concat(Date.now(), "_").concat(photo.name);
                            var storageRef = (0, storage_1.ref)(storage, "jerseys/".concat(uniqueName));
                            var uploadTask = (0, storage_1.uploadBytesResumable)(storageRef, photo);
                            return new Promise(function (resolve, reject) {
                                uploadTask.on('state_changed', function (snapshot) {
                                    var progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
                                    setUploadProgress(progress);
                                }, function (error) {
                                    reject(error);
                                }, function () { return __awaiter(void 0, void 0, void 0, function () {
                                    var downloadURL, error_2;
                                    return __generator(this, function (_a) {
                                        switch (_a.label) {
                                            case 0:
                                                _a.trys.push([0, 2, , 3]);
                                                return [4 /*yield*/, (0, storage_1.getDownloadURL)(uploadTask.snapshot.ref)];
                                            case 1:
                                                downloadURL = _a.sent();
                                                resolve(downloadURL);
                                                return [3 /*break*/, 3];
                                            case 2:
                                                error_2 = _a.sent();
                                                reject(error_2);
                                                return [3 /*break*/, 3];
                                            case 3: return [2 /*return*/];
                                        }
                                    });
                                }); });
                            });
                        }))];
                case 2:
                    downloadURLs_1 = _a.sent();
                    // ✅ Then proceed with Firestore order creation
                    console.log("Current user UID:", user === null || user === void 0 ? void 0 : user.uid);
                    console.log("Download URLs:", downloadURLs_1);
                    if (!(user === null || user === void 0 ? void 0 : user.uid)) {
                        throw new Error("User not logged in");
                    }
                    if (!downloadURLs_1 || downloadURLs_1.length === 0) {
                        throw new Error("No uploaded images found");
                    }
                    return [4 /*yield*/, (0, firestore_1.addDoc)((0, firestore_1.collection)(db, "orders"), {
                            userId: user === null || user === void 0 ? void 0 : user.uid,
                            jerseyImageUrl: downloadURLs_1[0],
                            allImages: downloadURLs_1,
                            orderDate: (0, firestore_1.serverTimestamp)(),
                            status: "draft",
                            paid: false,
                            stepCompleted: "upload", // you can update this throughout the process
                            notes: "",
                        })];
                case 3:
                    orderRef_1 = _a.sent();
                    sonner_1.toast.success("Photos uploaded and order created!");
                    setTimeout(function () {
                        navigate('/get-quote', {
                            state: {
                                orderId: orderRef_1.id,
                                photos: downloadURLs_1,
                                orderDate: (0, firestore_1.serverTimestamp)(),
                            },
                        });
                    }, 100);
                    return [3 /*break*/, 6];
                case 4:
                    error_1 = _a.sent();
                    console.error("Upload error:", error_1);
                    sonner_1.toast.error("Failed to upload or create order. Please try again.");
                    return [3 /*break*/, 6];
                case 5:
                    setUploading(false);
                    return [7 /*endfinally*/];
                case 6: return [2 /*return*/];
            }
        });
    }); };
    return (<div className="min-h-screen flex flex-col">
            <Header_1.default />
            <main className="flex-grow py-16 px-4">
                <div className="container-custom max-w-3xl">
                    <div className="glass-card p-8">
                        <h1 className="heading-lg text-center mb-2">Upload Photos</h1>
                        <p className="text-gray-600 text-center mb-8">
                            Please upload clear photos of your damaged jersey from multiple angles
                        </p>

                        <form onSubmit={handleSubmit} className="space-y-8">
                            <div className={"border-2 border-dashed rounded-lg p-8 text-center transition-colors ".concat(isDragging ? 'border-electric-blue bg-blue-50' : 'border-gray-300')} onDragEnter={handleDrag} onDragOver={handleDrag} onDragLeave={handleDrag} onDrop={handleDrop}>
                                <lucide_react_1.Camera className="mx-auto h-12 w-12 text-gray-400 mb-4"/>
                                <h2 className="heading-sm mb-2">Drag & Drop Photos Here</h2>
                                <p className="text-gray-500 mb-4">or</p>

                                <div className="flex justify-center">
                                    <div className="relative">
                                        <input_1.Input id="photo-upload" type="file" accept="image/*" multiple className="absolute inset-0 opacity-0 w-full h-full cursor-pointer" onChange={handleFileChange}/>
                                        <button_1.Button type="button" variant="outline">
                                            <lucide_react_1.Upload className="mr-2 h-4 w-4"/>
                                            Browse Files
                                        </button_1.Button>
                                    </div>
                                </div>

                                <p className="text-sm text-gray-500 mt-4">
                                    Upload up to 5 JPG or PNG images (max 5MB each)
                                </p>
                            </div>

                            {previews.length > 0 && (<div className="space-y-4">
                                    <h3 className="heading-sm">Uploaded Photos ({previews.length}/5)</h3>
                                    <div className={"grid grid-cols-2 md:grid-cols-3 gap-4 ".concat(previews.length > 3 ? 'overflow-x-auto' : '')}>
                                        {previews.map(function (preview, index) { return (<div key={index} className="relative">
                                                <img src={preview} alt={"Jersey photo ".concat(index + 1)} className="w-full h-40 object-cover rounded-lg"/>
                                                <button type="button" className="absolute top-2 right-2 bg-white rounded-full p-1 shadow-md" onClick={function () { return removePhoto(index); }}>
                                                    <lucide_react_1.X className="h-4 w-4 text-red-500"/>
                                                </button>
                                            </div>); })}
                                    </div>
                                </div>)}

                            <div className="flex justify-between">
                                <button_1.Button type="button" variant="outline" onClick={function () { return navigate('/'); }}>
                                    Back to Home
                                </button_1.Button>
                                <button_1.Button type="submit" disabled={photos.length === 0 || uploading}>
                                    {uploading ? "Uploading... ".concat(uploadProgress.toFixed(2), "%") : 'Continue to Get Quote'}
                                </button_1.Button>
                            </div>
                        </form>
                    </div>
                </div>
            </main>
            <Footer_1.default />
        </div>);
};
exports.default = UploadPhotos;
