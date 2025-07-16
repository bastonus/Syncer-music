import React from 'react';

const SearchBar = ({ query, onQueryChange, inputRef }) => {
  return (
    <div className="search-container">
      <svg className="search-icon" xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
      <input 
        ref={inputRef}
        type="text"
        className="search-input"
        placeholder="Rechercher une playlist..."
        value={query}
        onChange={(e) => onQueryChange(e.target.value)}
      />
    </div>
  );
};

export default SearchBar;
