import { Handle, Position } from 'reactflow';
import './UserNode.css';

const UserNode = ({ data }) => (
    <div className="user-node">
        <Handle type="target" position={Position.Left} className="handle" />
        <img
            src={data.avatar || 'https://via.placeholder.com/30'}
            alt="User Avatar"
            className="user-avatar"
            onError={e => e.target.src = 'https://via.placeholder.com/30'}
        />
        <span className="user-name">{data.name || 'Unknown User'}</span>
        <Handle type="source" position={Position.Right} className="handle" />
    </div>
);

export default UserNode;