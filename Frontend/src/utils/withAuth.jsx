import { useEffect } from "react";
import { useNavigate } from "react-router";

const withAuth = (WrappedComponent) => {
  const AuthComponent = (props) => {
    const router = useNavigate();

    const isAuthenticated = () => {
      if (localStorage.getItem("token")) {
        return true;
      }
      return false;
    };

    useEffect(() => {
      if (!isAuthenticated()) {
        router("/login");
      }
    }, []);
    return <WrappedComponent {...props} />;
  };

  return AuthComponent;
};

export default withAuth;
