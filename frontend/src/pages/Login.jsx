import { useState } from "react"; 
import "../styles/login.css";
import logo2 from "../assets/logo2.png";
import { loginCheck } from "../services/api"; 

export default function Login({ onLogin }) {
  // Removed isRegister state and registration-specific fields
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");

    if (!username || !password) {
      setError("Username and password must be filled in");
      return;
    }

    try {
      const result = await loginCheck(username, password);
      if (result.status === "success") { 
        onLogin(result.username);
      } else {
        setError("Username or password is incorrect");
      }
    } catch (error) {
      console.error("Login Error:", error);
      setError("Login failed. Please try again.");
    }
  };

  return (
    <div className="login-container">
      <img src={logo2} alt="Company Logo" className="login-logo" />
      <h1 className="brand-title"></h1>
      <p className="subtitle">Login to start your new session</p>

      <form className="form" onSubmit={handleLogin}>
        <label>Username</label>
        <input
          type="text"
          placeholder="User"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
        />

        <label>Password</label>
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />

        {error && <p className="error-text">{error}</p>}

        <button type="submit" className="login-btn">
          Login
        </button>
      </form>
    </div>
  );
}