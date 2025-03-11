import { Handle, Position } from 'reactflow';
import './SmsNode.css';

const SmsNode = ({ data }) => {
    const messages = data.messages || [];

    const formatTimestamp = (timestamp) => new Date(parseInt(timestamp)).toLocaleTimeString();

    return (
        <div className="sms-node">
            <div className="sms-header">WhatsApp Chat</div>
            <Handle type="target" position={Position.Left} className="handle" />
            <div className="sms-content">
                {messages.map((msg, index) => (
                    <div key={index} className="chat-bubble user-message">
                        <span className="bubble-text">{msg.text}</span>
                        <span className="bubble-timestamp">{formatTimestamp(msg.timestamp)}</span>
                    </div>
                ))}
            </div>
            <Handle type="source" position={Position.Right} className="handle" />
        </div>
    );
};

export default SmsNode;