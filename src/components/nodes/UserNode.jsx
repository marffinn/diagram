// src/components/nodes/UserNode.jsx
import { Handle, Position } from 'reactflow';
import { useState } from 'react'; // Added for state
import './UserNode.css';

const UserNode = ({ data }) => {
    const [avatarSrc, setAvatarSrc] = useState(data.avatar || 'https://via.placeholder.com/30x30'); // Default fallback

    const handleImageError = (e) => {
        console.error('Image load failed:', e.target.src);
        setAvatarSrc('https://via.placeholder.com/30x30'); // Fallback to placeholder
    };

    return (
        <div className="user-node">
            <Handle type="target" position={Position.Left} className="handle" />
            <img
                src={avatarSrc}
                alt="User Avatar"
                onError={handleImageError}
                style={{ width: '30px', height: '30px', borderRadius: '50%' }} // Ensure size
            />
            <p>{data.name}</p>
            <Handle type="source" position={Position.Right} className="handle" />
        </div>
    );
};

export default UserNode;