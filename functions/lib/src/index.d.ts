import { FirestoreEvent } from "firebase-functions/v2/firestore";
import { Change } from "firebase-functions";
export declare const notifyOnDelivery: import("firebase-functions").CloudFunction<FirestoreEvent<Change<import("firebase-functions/v2/firestore").QueryDocumentSnapshot> | undefined, {
    orderId: string;
}>>;
