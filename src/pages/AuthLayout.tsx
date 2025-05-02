
import { Outlet } from "react-router-dom";

const AuthLayout = () => {
    return (
        <div>
            {/* optional header or wrapper UI */}
            <Outlet />
            {/* optional footer or layout components */}
        </div>
    );
};

export default AuthLayout;
