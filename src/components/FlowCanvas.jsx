// src/components/FlowCanvas.jsx
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import ReactFlow, { Background, useNodesState, useEdgesState, addEdge, applyNodeChanges, useReactFlow } from 'reactflow';
import { nodeTypes, onNodeDataChange } from './nodeHandlers.jsx';
import './FlowCanvas.css';
import 'reactflow/dist/style.css';

// Singleton WebSocket
let ws = null;
const connectWebSocket = (setNodes, setEdges, fitView, nodes) => {
    if (ws && ws.readyState === WebSocket.OPEN) return ws;

    ws = new WebSocket('ws://localhost:8080');
    ws.onopen = () => console.log('Connected to WebSocket');
    ws.onmessage = (event) => {
        const { type, nodeId, parentId, message, timestamp } = JSON.parse(event.data);
        if (type === 'incoming-call') {
            console.log(`Panning to node ${nodeId} for ${type}`);
            fitView({ nodes: [{ id: nodeId }], duration: 1000, padding: 0.2 });
        } else if (type === 'incoming-sms' && nodeId) {
            console.log(`Handling SMS for node ${nodeId}`);
            const parentNode = nodes.find(n => n.id === parentId);
            const existingSmsNode = nodes.find(n => n.id === nodeId);
            if (existingSmsNode) {
                setNodes(nds => nds.map(n => n.id === nodeId ? {
                    ...n,
                    data: { messages: [...(n.data.messages || []), { text: message, timestamp }] }
                } : n));
            } else if (parentNode) {
                const newNode = {
                    id: nodeId,
                    type: 'sms',
                    position: { x: parentNode.position.x + 150, y: parentNode.position.y + 50 },
                    data: { messages: [{ text: message, timestamp }] }
                };
                setNodes(nds => [...nds, newNode]);
                setEdges(eds => [...eds, { id: `edge-${timestamp}`, source: parentId, target: nodeId }]);
            }
            fitView({ nodes: [{ id: nodeId }], duration: 1000, padding: 0.2 });
        }
    };
    ws.onerror = (err) => console.error('WebSocket error:', err);
    ws.onclose = () => console.log('WebSocket closed');
    return ws;
};

const FlowCanvas = ({ user }) => {
    const [nodes, setNodes, onNodesChangeBase] = useNodesState([]);
    const [edges, setEdges, onEdgesChange] = useEdgesState([]);
    const [contextMenu, setContextMenu] = useState(null);
    const [connectingNodeId, setConnectingNodeId] = useState(null);
    const [selectedNodeId, setSelectedNodeId] = useState(null);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const { screenToFlowPosition, fitView } = useReactFlow();

    const nodeTypesMemo = useMemo(() => {
        return Object.fromEntries(
            Object.entries(nodeTypes).map(([type, Component]) => [
                type,
                (props) => <Component {...props} onNodeDataChange={onNodeDataChange(setNodes)} />
            ])
        );
    }, [setNodes]);

    useEffect(() => {
        if (!user) return;

        const fetchData = async (url, setter) => {
            try {
                const res = await fetch(url, { credentials: 'include' });
                if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
                setter(await res.json());
            } catch (err) {
                console.error(`Error fetching ${url}:`, err);
            }
        };
        fetchData('http://localhost:3000/api/nodes', (data) => {
            setNodes(data);
            setTimeout(() => fitView({ duration: 1000, padding: 0.2 }), 100);
        });
        fetchData('http://localhost:3000/api/edges', setEdges);

        connectWebSocket(setNodes, setEdges, fitView, nodes);

        return () => {
            if (ws && ws.readyState === WebSocket.OPEN) {
                ws.close();
            }
        };
    }, [user, setNodes, setEdges, fitView]);

    useEffect(() => {
        const handleOutsideClick = (event) => {
            if (contextMenu && !event.target.closest('.context-menu') && !event.target.closest('.modal')) {
                setContextMenu(null);
            }
        };
        document.addEventListener('mousedown', handleOutsideClick);
        return () => document.removeEventListener('mousedown', handleOutsideClick);
    }, [contextMenu]);

    const apiCall = (method, url, body) => fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(body)
    }).then(res => res.json()).catch(err => console.error(`Error in ${method} ${url}:`, err));

    const onConnectStart = useCallback((_, { nodeId }) => setConnectingNodeId(nodeId), []);
    const onConnect = useCallback((params) => {
        setEdges(eds => addEdge(params, eds));
        apiCall('POST', 'http://localhost:3000/api/edges', params);
    }, [setEdges]);
    const onEdgeUpdate = useCallback((oldEdge, newConnection) => setEdges(eds => addEdge(newConnection, eds.filter(e => e.id !== oldEdge.id))), [setEdges]);
    const onConnectEnd = useCallback((event) => {
        if (!connectingNodeId) return;

        const targetIsNode = event.target.className.includes('react-flow__node');
        if (targetIsNode) {
            setConnectingNodeId(null);
            return;
        }

        const sourceNode = nodes.find(node => node.id === connectingNodeId);
        const newNodeId = `node-${Date.now()}`;
        const position = screenToFlowPosition({ x: event.clientX, y: event.clientY });

        let newNode;
        if (sourceNode.type === 'user') {
            newNode = {
                id: newNodeId,
                type: 'customer',
                position,
                data: { client_name: 'New Customer', client_emails: [], client_phones: [], client_note: '' }
            };
        } else {
            const hasSmsNode = edges.some(e => e.source === sourceNode.id && nodes.find(n => n.id === e.target)?.type === 'sms');
            if (!hasSmsNode) {
                newNode = {
                    id: newNodeId,
                    type: 'timer',
                    position,
                    data: { created_at: Date.now() }
                };
            } else {
                console.log('Parent already has an SmsNode—no new node created');
                setConnectingNodeId(null);
                return;
            }
        }

        setNodes(nds => nds.concat(newNode));
        setEdges(eds => addEdge({ source: connectingNodeId, target: newNodeId }, eds));
        apiCall('POST', 'http://localhost:3000/api/edges', { source: connectingNodeId, target: newNodeId });
        apiCall('POST', 'http://localhost:3000/api/nodes', {
            id: newNodeId,
            type: newNode.type,
            x: position.x,
            y: position.y,
            ...newNode.data
        });
        setConnectingNodeId(null);
    }, [setNodes, setEdges, connectingNodeId, screenToFlowPosition, nodes, edges]);

    const onNodesChange = useCallback((changes) => {
        setNodes(nds => applyNodeChanges(changes, nds));
        changes.forEach(change => {
            if (change.type === 'position' && change.position) {
                const node = nodes.find(n => n.id === change.id);
                if (node) {
                    apiCall('PUT', `http://localhost:3000/api/nodes/${node.id}`, {
                        x: change.position.x,
                        y: change.position.y,
                        type: node.type,
                        ...node.data
                    });
                }
            }
        });
    }, [setNodes, nodes]);

    const saveNodes = () => {
        Promise.all(nodes.map(node => apiCall('PUT', `http://localhost:3000/api/nodes/${node.id}`, {
            x: node.position.x,
            y: node.position.y,
            type: node.type,
            ...node.data
        }).then(data => console.log('Save response:', data)))).then(() => alert('Nodes saved!'));
    };

    const handleLogout = () => apiCall('GET', 'http://localhost:3000/api/logout').then(() => window.location.href = 'http://localhost:5173');

    const onNodeContextMenu = useCallback((event, node) => {
        event.preventDefault();
        setContextMenu({ x: event.clientX, y: event.clientY, nodeId: node.id, nodeType: node.type });
    }, []);

    const changeNodeType = (newType) => {
        const parentNode = nodes.find(n => n.id === contextMenu.nodeId);
        const hasSmsNode = edges.some(e => e.source === parentNode.id && nodes.find(n => n.id === e.target)?.type === 'sms');
        if (newType === 'sms' && hasSmsNode) {
            alert('Parent already has an SmsNode—cannot change to another!');
            setContextMenu(null);
            return;
        }

        setNodes(nds => nds.map(node => node.id === contextMenu.nodeId ? {
            ...node,
            type: newType,
            data: {
                ...(newType === 'timer' && { created_at: Date.now() }),
                ...(newType === 'customer' && { client_name: 'New Customer', client_emails: [], client_phones: [], client_note: '' }),
                ...(newType === 'note' && { notes: 'New Note' }),
                ...(newType === 'sms' && { messages: [] }),
                ...(newType === 'contractor' && {
                    contractor_name: 'New Contractor',
                    services: '',
                    emails: [],
                    numbers: [],
                    price_suggested: '',
                    created_at: Date.now()
                })
            }
        } : node));
        apiCall('PUT', `http://localhost:3000/api/nodes/${contextMenu.nodeId}`, {
            type: newType,
            x: parentNode.position.x,
            y: parentNode.position.y,
            ...(newType === 'timer' && { created_at: Date.now() }),
            ...(newType === 'customer' && { client_name: 'New Customer', client_emails: [], client_phones: [], client_note: '' }),
            ...(newType === 'note' && { notes: 'New Note' }),
            ...(newType === 'sms' && { messages: [] }),
            ...(newType === 'contractor' && {
                contractor_name: 'New Contractor',
                services: '',
                emails: [],
                numbers: [],
                price_suggested: '',
                created_at: Date.now()
            })
        });
        setContextMenu(null);
    };

    const handleDeleteClick = () => {
        if (contextMenu.nodeType === 'sms') {
            setShowDeleteModal(true);
        } else if (contextMenu.nodeType === 'user') {
            alert('Cannot delete the User Node!');
            setContextMenu(null);
        } else {
            apiCall('DELETE', `http://localhost:3000/api/nodes/${contextMenu.nodeId}`);
            setNodes(nds => nds.filter(node => node.id !== contextMenu.nodeId));
            setEdges(eds => eds.filter(edge => edge.source !== contextMenu.nodeId && edge.target !== contextMenu.nodeId));
            setContextMenu(null);
        }
    };

    const handleConfirmDelete = () => {
        if (contextMenu) { // Check contextMenu exists
            apiCall('DELETE', `http://localhost:3000/api/nodes/${contextMenu.nodeId}`);
            setNodes(nds => nds.filter(node => node.id !== contextMenu.nodeId));
            setEdges(eds => eds.filter(edge => edge.source !== contextMenu.nodeId && edge.target !== contextMenu.nodeId));
        }
        setShowDeleteModal(false);
        setContextMenu(null);
    };

    const disconnectEdges = () => setEdges(eds => eds.filter(edge => edge.source !== contextMenu.nodeId && edge.target !== contextMenu.nodeId));

    const onNodeClick = useCallback((event, node) => {
        if (contextMenu && node.id !== contextMenu.nodeId) {
            setContextMenu(null);
        }
        setSelectedNodeId(node.id);

        const getConnectedEdges = (nodeId, edgeSet = new Set(), visitedNodes = new Set()) => {
            if (visitedNodes.has(nodeId)) return edgeSet;
            visitedNodes.add(nodeId);

            const currentNode = nodes.find(n => n.id === nodeId);
            if (currentNode && currentNode.type === 'user') return edgeSet;

            edges.forEach(edge => {
                if (edge.source === nodeId || edge.target === nodeId) {
                    if (!edgeSet.has(edge.id)) {
                        edgeSet.add(edge.id);
                        const nextNodeId = edge.source === nodeId ? edge.target : edge.source;
                        getConnectedEdges(nextNodeId, edgeSet, visitedNodes);
                    }
                }
            });
            return edgeSet;
        };

        const connectedEdgeIds = getConnectedEdges(node.id);
        setEdges(eds => eds.map(edge => ({
            ...edge,
            style: connectedEdgeIds.has(edge.id)
                ? { stroke: '#22c55e', strokeWidth: 2 }
                : { stroke: '#b1b1b7', strokeWidth: 1 }
        })));
    }, [edges, nodes, setEdges, contextMenu]);

    const onPaneClick = useCallback(() => {
        if (contextMenu) {
            setContextMenu(null);
        }
    }, [contextMenu]);

    return (
        <div className="flow-canvas-container">
            <button className="save-button" onClick={saveNodes}>Save Nodes</button>
            <div className="user-info">
                <img src={user.avatar} alt="Avatar" className="user-avatar" />
                <span className="user-name">{user.displayName}</span>
                <button className="logout-button" onClick={handleLogout}>Logout</button>
            </div>
            {contextMenu && (
                <div className="context-menu" style={{ top: contextMenu.y, left: contextMenu.x }}>
                    {['customer', 'note', 'sms', 'timer', 'contractor'].map(type => (
                        <div key={type} className="context-item" onClick={() => changeNodeType(type)}>
                            Change to {type.charAt(0).toUpperCase() + type.slice(1)}
                        </div>
                    ))}
                    <div className="context-item delete-item" onClick={handleDeleteClick}>Delete Node</div>
                    <div className="context-item" onClick={disconnectEdges}>Disconnect Edges</div>
                </div>
            )}
            {showDeleteModal && (
                <div className="modal-overlay">
                    <div className="modal">
                        <p>Are you sure you want to delete this SMS node?</p>
                        <button onClick={handleConfirmDelete}>Yes</button>
                        <button onClick={() => { setShowDeleteModal(false); }}>No</button>
                    </div>
                </div>
            )}
            <ReactFlow
                nodes={nodes.map(node => ({
                    ...node,
                    className: node.id === selectedNodeId ? 'selected-node' : ''
                }))}
                edges={edges}
                onNodesChange={onNodesChange}
                onEdgesChange={onEdgesChange}
                onConnect={onConnect}
                onEdgeUpdate={onEdgeUpdate}
                onConnectStart={onConnectStart}
                onConnectEnd={onConnectEnd}
                onNodeContextMenu={onNodeContextMenu}
                onNodeClick={onNodeClick}
                onPaneClick={onPaneClick}
                nodeTypes={nodeTypesMemo}
                minZoom={0.1}
                snapToGrid={true}
                snapGrid={[15, 15]}
                className="react-flow"
            >
                <Background />
            </ReactFlow>
        </div>
    );
};

export default FlowCanvas;