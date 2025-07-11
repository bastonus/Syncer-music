import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';

const SharePage = () => {
  const { shareId } = useParams();
  const [shareData, setShareData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchShareData = async () => {
      try {
        const response = await fetch(`/api/share/${shareId}`);
        if (!response.ok) throw new Error('Share not found');
        const data = await response.json();
        setShareData(data);
      } catch (error) {
        console.error(error);
        setShareData(null); // Ensure no old data is shown
      } finally {
        setIsLoading(false);
      }
    };
    fetchShareData();
  }, [shareId]);

  if (isLoading) {
    return <div>Loading shared playlist...</div>;
  }

  if (!shareData) {
    return <div>Could not find shared playlist.</div>;
  }

  return (
    <div>
      <h1>{shareData.name}</h1>
      <p>A playlist from <strong>{shareData.sourceService}</strong>. Click a track to open it in your favorite service.</p>
      <ul>
        {shareData.tracks.map((track, index) => (
          <li key={index}>
            {track.name} by {track.artist}
            <div>
              {track.links.spotify && <a href={track.links.spotify} target="_blank" rel="noopener noreferrer">Spotify</a>}
              {track.links.deezer && <a href={track.links.deezer} target="_blank" rel="noopener noreferrer">Deezer</a>}
              {track.links.youtube && <a href={track.links.youtube} target="_blank" rel="noopener noreferrer">YouTube</a>}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default SharePage; 