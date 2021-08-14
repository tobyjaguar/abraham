import React, { Component } from 'react';

function Admin() {
  
  const handleLogout = () => {
    localStorage.clear();
    window.location.reload();
  };

  return (
    <div className="App">
      <h1>Admin</h1>
      <button className="btn btn-primary" onClick={handleLogout}>
        Logout
      </button>
    </div>
  );
}

export default Admin
