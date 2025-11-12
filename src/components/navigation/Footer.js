import React from 'react';
import '../styles/Footer.css';

const Footer = ({ variant }) => {
  const footerClass = variant === "homeHeader" ? "footerStyle homeFooter" : "footerStyle authFooter";

  return (
    <footer className={footerClass}>
      <div className="containerStyle">
        <p>&copy; 2025 AutoFinAudit</p>
      </div>
    </footer>
  );
};

export default Footer;
