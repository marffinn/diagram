import { Handle, Position } from 'reactflow';
import './SmsNode.css';

const SmsNode = ({ data }) => {
    // Dummy chat data for now
    const dummyMessages = [
        { id: 1, text: "Hey, how's it going?", sender: 'user', timestamp: '10:30 AM' },
        { id: 2, text: "Pretty good, you?", sender: 'other', timestamp: '10:31 AM' },
        { id: 3, text: "Same! Any plans today?", sender: 'user', timestamp: '10:32 AM' },
    ];

    return (
        <div className="sms-node">
            <div className="sms-header">WhatsApp Chat</div>
            <Handle type="target" position={Position.Left} className="handle" />
            <div className="sms-content">
                {dummyMessages.map((msg) => (
                    <div
                        key={msg.id}
                        className={`chat-bubble ${msg.sender === 'user' ? 'user-message' : 'other-message'}`}
                    >
                        <span className="bubble-text">{msg.text}</span>
                        <span className="bubble-timestamp">{msg.timestamp}</span>
                    </div>
                ))}
            </div>
            <Handle type="source" position={Position.Right} className="handle" />
        </div>
    );
};

export default SmsNode;