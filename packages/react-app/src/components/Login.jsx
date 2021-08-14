import React, { useState } from "react";
import { useHistory } from "react-router-dom";


export default function Login() {
  const [userData, setUserData] = useState({ username: "", password: "" });
  const [errorMessage, setErrorMessage] = useState({ value: "" });
  const history = useHistory();
  console.log("auth", localStorage.getItem("isAuthenticated"));

  const handleInputChange = (e) => {
    e.persist();
    console.log("handle  me")
    console.log(e)
    console.log(e.target)
    setUserData((prevState) => {
      return {
        ...prevState,
        [e.target.name]: e.target.value,
      };
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    //if username or password field is empty, return error message
    if (userData.username === "" || userData.password === "") {
      setErrorMessage((prevState) => ({
        value: "Empty username/password field",
      }));
    } else if (userData.username == "admin" && userData.password == "123456") {
      localStorage.setItem("isAuthenticated", "true");
      window.location.reload()
    } else {
      setErrorMessage((prevState) => ({ value: "Invalid username/password" }));
    }
  };

  return (
    <div className="text-center">
      <h1>Should you be here?</h1>
      <form
        style={{
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        <div className="form-group">
          <label>Username</label>
          <input
            className="form-control"
            type="text"
            name="username"
            onChange={(e) => handleInputChange(e)}
          />
        </div>

        <div className="form-group">
          <label>Password</label>
          <input
            className="form-control"
            type="password"
            name="password"
            onChange={(e) => handleInputChange(e)}
          />
        </div>
        <button
          type="submit"
          className="btn btn-primary"
          onClick={handleSubmit}
        >
          Enter
        </button>

        {errorMessage.value && (
          <p className="text-danger"> {errorMessage.value} </p>
        )}
      </form>
    </div>
  );
}

