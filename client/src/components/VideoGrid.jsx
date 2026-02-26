import { useEffect, useRef, useState, useCallback } from 'react';
import { Camera, CameraOff, MicOff, Mic, Monitor, MonitorOff, X, Maximize2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const ICE_SERVERS = {
    iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
    ],
};

// ─── Helper: create or retrieve a peer connection ─────────────────────────────
// kind: 'cam' | 'screen'
const makePeerKey = (socketId, kind) => `${socketId}__${kind}`;

const VideoGrid = ({ socket, roomId }) => {
    const { user } = useAuth();
    const myUsername = user?.username || 'You';

    // ── Local state ────────────────────────────────────────────────────────────
    const [isVideoOn, setIsVideoOn] = useState(false);
    const [isScreenOn, setIsScreenOn] = useState(false);
    const [isMuted, setIsMuted] = useState(false);

    // Remote streams: { socketId: { camStream, screenStream, username } }
    const [remoteStreams, setRemoteStreams] = useState({});

    // Focused tile: { socketId, kind } | null
    const [focusedTile, setFocusedTile] = useState(null);

    // ── Refs ───────────────────────────────────────────────────────────────────
    const localVideoRef = useRef(null);
    const localScreenRef = useRef(null);
    const localCamStreamRef = useRef(null);
    const localScreenStreamRef = useRef(null);
    const peersRef = useRef({});       // { peerKey: RTCPeerConnection }

    // ── Utilities ──────────────────────────────────────────────────────────────

    const removeRemotePeer = (socketId, kind) => {
        const key = makePeerKey(socketId, kind);
        if (peersRef.current[key]) {
            peersRef.current[key].close();
            delete peersRef.current[key];
        }
        setRemoteStreams(prev => {
            const entry = prev[socketId];
            if (!entry) return prev;
            const updated = { ...entry };
            if (kind === 'cam') updated.camStream = null;
            if (kind === 'screen') updated.screenStream = null;
            // Clean up entry if both streams gone
            if (!updated.camStream && !updated.screenStream) {
                const next = { ...prev };
                delete next[socketId];
                return next;
            }
            return { ...prev, [socketId]: updated };
        });
    };

    // ── Create Peer Connection ─────────────────────────────────────────────────
    const createPeerConnection = useCallback((partnerSocketId, kind, initiator, username) => {
        const key = makePeerKey(partnerSocketId, kind);
        if (peersRef.current[key]) return peersRef.current[key];

        const pc = new RTCPeerConnection(ICE_SERVERS);
        peersRef.current[key] = pc;

        // ICE candidates
        pc.onicecandidate = (event) => {
            if (!event.candidate) return;
            const evtName = kind === 'cam' ? 'webrtc-ice-candidate' : 'webrtc-screen-ice-candidate';
            socket.emit(evtName, { to: partnerSocketId, candidate: event.candidate });
        };

        // Incoming track → update remote streams via stable setRemoteStreams
        pc.ontrack = (event) => {
            const stream = event.streams[0];
            const streamKey = kind === 'cam' ? 'camStream' : 'screenStream';
            const resolvedName = username;
            setRemoteStreams(prev => ({
                ...prev,
                [partnerSocketId]: {
                    camStream: null,
                    screenStream: null,
                    ...prev[partnerSocketId],
                    [streamKey]: stream,
                    username: resolvedName || prev[partnerSocketId]?.username || 'User',
                },
            }));
        };

        // Add local tracks if available
        const localStream = kind === 'cam' ? localCamStreamRef.current : localScreenStreamRef.current;
        if (localStream) {
            localStream.getTracks().forEach(track => pc.addTrack(track, localStream));
        }

        if (initiator) {
            const offerEvt = kind === 'cam' ? 'webrtc-offer' : 'webrtc-screen-offer';
            pc.createOffer()
                .then(offer => pc.setLocalDescription(offer))
                .then(() => socket.emit(offerEvt, { to: partnerSocketId, offer: pc.localDescription, username: myUsername }));
        }

        return pc;
    }, [socket, myUsername]);

    // Note: get-room-peers is emitted directly in toggleCamera/toggleScreenShare;
    // the response is handled by the 'room-peers' socket listener in useEffect below.

    // ── Socket event handlers ─────────────────────────────────────────────────
    useEffect(() => {
        if (!socket) return;

        // ── Camera status from remote user ─────────────────
        // When a remote user turns on camera, they call get-room-peers and send
        // us a webrtc-offer. We just pre-register the username here so the tile
        // shows up immediately. The actual WebRTC connection is set up in handleOffer.
        const handleCameraStatus = ({ socketId, isVideoOn: remoteOn, username }) => {
            if (remoteOn) {
                // Pre-register username; the remote will send us an offer via get-room-peers
                setRemoteStreams(prev => ({
                    ...prev,
                    [socketId]: { camStream: null, screenStream: null, ...prev[socketId], username: username || 'User' },
                }));
            } else {
                removeRemotePeer(socketId, 'cam');
            }
        };

        // ── Screen status from remote user ─────────────────
        const handleScreenStatus = ({ socketId, isScreenOn: remoteOn, username }) => {
            if (remoteOn) {
                // Pre-register username; the remote will send us an offer via get-room-peers
                setRemoteStreams(prev => ({
                    ...prev,
                    [socketId]: { camStream: null, screenStream: null, ...prev[socketId], username: username || 'User' },
                }));
            } else {
                removeRemotePeer(socketId, 'screen');
            }
        };

        // ── Room peers response → send offers ──────────────
        // Called after we start sharing (cam or screen). We are the initiator.
        const handleRoomPeers = ({ peers }) => {
            peers.forEach(({ id: peerId, username: peerUsername }) => {
                // Send cam offer if we have a cam stream
                if (localCamStreamRef.current && !peersRef.current[makePeerKey(peerId, 'cam')]) {
                    createPeerConnection(peerId, 'cam', true, peerUsername);
                }
                // Send screen offer if we have a screen stream
                if (localScreenStreamRef.current && !peersRef.current[makePeerKey(peerId, 'screen')]) {
                    createPeerConnection(peerId, 'screen', true, peerUsername);
                }
            });
        };

        // ── A new user joined - if we have streams, offer to them ──────────────
        const handleUserJoined = ({ socketId, username: peerUsername }) => {
            // Small delay so the new user's VideoGrid is ready for WebRTC events
            setTimeout(() => {
                if (localCamStreamRef.current && !peersRef.current[makePeerKey(socketId, 'cam')]) {
                    createPeerConnection(socketId, 'cam', true, peerUsername);
                }
                if (localScreenStreamRef.current && !peersRef.current[makePeerKey(socketId, 'screen')]) {
                    createPeerConnection(socketId, 'screen', true, peerUsername);
                }
            }, 300);
        };

        // ── Existing user re-announces streams to a newly joined user ──────────
        const handleMediaStatusRequest = ({ newUserSocketId } = {}) => {
            if (!newUserSocketId) return;
            // Re-announce status so the new user's handleCameraStatus fires
            if (localCamStreamRef.current) {
                socket.emit('camera-toggle', { roomId, isVideoOn: true, username: myUsername });
                // Send WebRTC offer directly to the new user (not broadcast)
                setTimeout(() => {
                    if (!peersRef.current[makePeerKey(newUserSocketId, 'cam')]) {
                        createPeerConnection(newUserSocketId, 'cam', true, myUsername);
                    }
                }, 400);
            }
            if (localScreenStreamRef.current) {
                socket.emit('screen-share-toggle', { roomId, isScreenOn: true, username: myUsername });
                setTimeout(() => {
                    if (!peersRef.current[makePeerKey(newUserSocketId, 'screen')]) {
                        createPeerConnection(newUserSocketId, 'screen', true, myUsername);
                    }
                }, 400);
            }
        };

        // ── WebRTC offer (camera) ──────────────────────────
        const handleOffer = async ({ from, offer, username }) => {
            // Close any existing connection for this peer+kind before accepting
            const existingKey = makePeerKey(from, 'cam');
            if (peersRef.current[existingKey]) {
                peersRef.current[existingKey].close();
                delete peersRef.current[existingKey];
            }
            const pc = createPeerConnection(from, 'cam', false, username);
            await pc.setRemoteDescription(new RTCSessionDescription(offer));
            const answer = await pc.createAnswer();
            await pc.setLocalDescription(answer);
            socket.emit('webrtc-answer', { to: from, answer });
        };

        // ── WebRTC answer (camera) ─────────────────────────
        const handleAnswer = async ({ from, answer }) => {
            const pc = peersRef.current[makePeerKey(from, 'cam')];
            if (pc) await pc.setRemoteDescription(new RTCSessionDescription(answer));
        };

        // ── ICE candidate (camera) ─────────────────────────
        const handleIce = async ({ from, candidate }) => {
            const pc = peersRef.current[makePeerKey(from, 'cam')];
            if (pc) {
                try { await pc.addIceCandidate(new RTCIceCandidate(candidate)); }
                catch (e) { console.error('ICE cam error', e); }
            }
        };

        // ── WebRTC offer (screen) ──────────────────────────
        const handleScreenOffer = async ({ from, offer, username }) => {
            // Close any existing connection for this peer+kind before accepting
            const existingKey = makePeerKey(from, 'screen');
            if (peersRef.current[existingKey]) {
                peersRef.current[existingKey].close();
                delete peersRef.current[existingKey];
            }
            const pc = createPeerConnection(from, 'screen', false, username);
            await pc.setRemoteDescription(new RTCSessionDescription(offer));
            const answer = await pc.createAnswer();
            await pc.setLocalDescription(answer);
            socket.emit('webrtc-screen-answer', { to: from, answer });
        };

        // ── WebRTC answer (screen) ─────────────────────────
        const handleScreenAnswer = async ({ from, answer }) => {
            const pc = peersRef.current[makePeerKey(from, 'screen')];
            if (pc) await pc.setRemoteDescription(new RTCSessionDescription(answer));
        };

        // ── ICE candidate (screen) ─────────────────────────
        const handleScreenIce = async ({ from, candidate }) => {
            const pc = peersRef.current[makePeerKey(from, 'screen')];
            if (pc) {
                try { await pc.addIceCandidate(new RTCIceCandidate(candidate)); }
                catch (e) { console.error('ICE screen error', e); }
            }
        };

        socket.on('camera-status', handleCameraStatus);
        socket.on('screen-status', handleScreenStatus);
        socket.on('room-peers', handleRoomPeers);
        socket.on('user-joined-room', handleUserJoined);
        socket.on('media-status-request', handleMediaStatusRequest);
        socket.on('webrtc-offer', handleOffer);
        socket.on('webrtc-answer', handleAnswer);
        socket.on('webrtc-ice-candidate', handleIce);
        socket.on('webrtc-screen-offer', handleScreenOffer);
        socket.on('webrtc-screen-answer', handleScreenAnswer);
        socket.on('webrtc-screen-ice-candidate', handleScreenIce);

        return () => {
            socket.off('camera-status', handleCameraStatus);
            socket.off('screen-status', handleScreenStatus);
            socket.off('room-peers', handleRoomPeers);
            socket.off('user-joined-room', handleUserJoined);
            socket.off('media-status-request', handleMediaStatusRequest);
            socket.off('webrtc-offer', handleOffer);
            socket.off('webrtc-answer', handleAnswer);
            socket.off('webrtc-ice-candidate', handleIce);
            socket.off('webrtc-screen-offer', handleScreenOffer);
            socket.off('webrtc-screen-answer', handleScreenAnswer);
            socket.off('webrtc-screen-ice-candidate', handleScreenIce);
        };
    }, [socket, createPeerConnection]);

    // ── Assign local camera srcObject after it mounts ─────────────────────────
    useEffect(() => {
        if (isVideoOn && localVideoRef.current && localCamStreamRef.current) {
            localVideoRef.current.srcObject = localCamStreamRef.current;
        }
    }, [isVideoOn]);

    // ── Assign local screen srcObject after it mounts ─────────────────────────
    useEffect(() => {
        if (isScreenOn && localScreenRef.current && localScreenStreamRef.current) {
            localScreenRef.current.srcObject = localScreenStreamRef.current;
        }
    }, [isScreenOn]);

    // ── Toggle Camera ─────────────────────────────────────────────────────────
    const toggleCamera = async () => {
        if (isVideoOn) {
            localCamStreamRef.current?.getTracks().forEach(t => t.stop());
            localCamStreamRef.current = null;
            if (localVideoRef.current) localVideoRef.current.srcObject = null;
            setIsVideoOn(false);
            socket.emit('camera-toggle', { roomId, isVideoOn: false, username: myUsername });
            // Close all camera peer connections
            Object.keys(peersRef.current).forEach(key => {
                if (key.endsWith('__cam')) {
                    peersRef.current[key].close();
                    delete peersRef.current[key];
                }
            });
            // Remove remote cam streams (keep screen streams)
            setRemoteStreams(prev => {
                const next = {};
                Object.entries(prev).forEach(([sid, data]) => {
                    if (data.screenStream) next[sid] = { ...data, camStream: null };
                });
                return next;
            });
        } else {
            try {
                const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
                localCamStreamRef.current = stream;
                setIsVideoOn(true);
                socket.emit('camera-toggle', { roomId, isVideoOn: true, username: myUsername });
                // Assign srcObject immediately (state update is async so video el may not exist yet)
                if (localVideoRef.current) {
                    localVideoRef.current.srcObject = stream;
                } else {
                    setTimeout(() => {
                        if (localVideoRef.current) localVideoRef.current.srcObject = stream;
                    }, 100);
                }
                // Small delay so state settles, then request peer list and send offers
                setTimeout(() => socket.emit('get-room-peers', { roomId }), 200);
            } catch (err) {
                console.error('Failed to get camera:', err);
                alert('Could not access camera/microphone. Please check permissions.');
            }
        }
    };

    // ── Toggle Screen Share ───────────────────────────────────────────────────
    const toggleScreenShare = async () => {
        if (isScreenOn) {
            localScreenStreamRef.current?.getTracks().forEach(t => t.stop());
            localScreenStreamRef.current = null;
            if (localScreenRef.current) localScreenRef.current.srcObject = null;
            setIsScreenOn(false);
            socket.emit('screen-share-toggle', { roomId, isScreenOn: false, username: myUsername });
            Object.keys(peersRef.current).forEach(key => {
                if (key.endsWith('__screen')) {
                    peersRef.current[key].close();
                    delete peersRef.current[key];
                }
            });
            setRemoteStreams(prev => {
                const next = {};
                Object.entries(prev).forEach(([sid, data]) => {
                    if (data.camStream) next[sid] = { ...data, screenStream: null };
                });
                return next;
            });
        } else {
            try {
                const stream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: false });
                localScreenStreamRef.current = stream;
                setIsScreenOn(true);
                socket.emit('screen-share-toggle', { roomId, isScreenOn: true, username: myUsername });
                // Assign srcObject immediately
                if (localScreenRef.current) {
                    localScreenRef.current.srcObject = stream;
                } else {
                    setTimeout(() => {
                        if (localScreenRef.current) localScreenRef.current.srcObject = stream;
                    }, 50);
                }
                socket.emit('get-room-peers', { roomId });

                // When user stops sharing via browser UI
                stream.getVideoTracks()[0].onended = () => {
                    localScreenStreamRef.current = null;
                    if (localScreenRef.current) localScreenRef.current.srcObject = null;
                    setIsScreenOn(false);
                    socket.emit('screen-share-toggle', { roomId, isScreenOn: false, username: myUsername });
                    Object.keys(peersRef.current).forEach(key => {
                        if (key.endsWith('__screen')) {
                            peersRef.current[key].close();
                            delete peersRef.current[key];
                        }
                    });
                };
            } catch (err) {
                if (err.name !== 'NotAllowedError') {
                    console.error('Failed to get screen:', err);
                    alert('Could not access screen share.');
                }
            }
        }
    };

    // ── Toggle Mute ───────────────────────────────────────────────────────────
    const toggleMute = () => {
        if (localCamStreamRef.current) {
            localCamStreamRef.current.getAudioTracks().forEach(t => { t.enabled = isMuted; }); // isMuted is current state, toggling to opposite
            setIsMuted(prev => !prev);
        }
    };

    // ── Derived ───────────────────────────────────────────────────────────────
    const hasAnyVideo = isVideoOn || isScreenOn || Object.keys(remoteStreams).length > 0;
    const remotePeerIds = Object.keys(remoteStreams);

    // ── Handle tile click → expand ─────────────────────────────────────────────
    const handleTileClick = (socketId, kind) => {
        setFocusedTile(prev =>
            prev && prev.socketId === socketId && prev.kind === kind ? null : { socketId, kind }
        );
    };

    const handleLocalTileClick = (kind) => {
        setFocusedTile(prev =>
            prev && prev.socketId === 'local' && prev.kind === kind ? null : { socketId: 'local', kind }
        );
    };

    return (
        <div className="video-panel">
            {/* Controls bar */}
            <div className="video-controls">
                <span style={{ fontSize: '0.8rem', fontWeight: 'bold', color: 'var(--text-dim)' }}>
                    📹 Media
                </span>
                <div style={{ display: 'flex', gap: '0.4rem' }}>
                    {isVideoOn && (
                        <button
                            onClick={toggleMute}
                            className="tool-btn"
                            title={isMuted ? 'Unmute' : 'Mute'}
                            style={{
                                width: '30px', height: '30px',
                                background: isMuted ? '#fee2e2' : '#f0fdf4',
                                color: isMuted ? '#dc2626' : '#16a34a',
                                border: `1px solid ${isMuted ? '#fca5a5' : '#86efac'}`,
                                borderRadius: '6px'
                            }}
                        >
                            {isMuted ? <MicOff size={14} /> : <Mic size={14} />}
                        </button>
                    )}
                    {/* Camera toggle */}
                    <button
                        onClick={toggleCamera}
                        className="tool-btn"
                        title={isVideoOn ? 'Turn off camera' : 'Share your camera'}
                        style={{
                            width: '30px', height: '30px',
                            background: isVideoOn ? '#eef2ff' : '#f3f4f6',
                            color: isVideoOn ? 'var(--primary)' : 'var(--text)',
                            border: `1px solid ${isVideoOn ? 'var(--primary)' : '#e5e7eb'}`,
                            borderRadius: '6px'
                        }}
                    >
                        {isVideoOn ? <Camera size={14} /> : <CameraOff size={14} />}
                    </button>
                    {/* Screen share toggle */}
                    <button
                        onClick={toggleScreenShare}
                        className="tool-btn"
                        title={isScreenOn ? 'Stop screen share' : 'Share your screen'}
                        style={{
                            width: '30px', height: '30px',
                            background: isScreenOn ? '#fdf4ff' : '#f3f4f6',
                            color: isScreenOn ? '#9333ea' : 'var(--text)',
                            border: `1px solid ${isScreenOn ? '#c084fc' : '#e5e7eb'}`,
                            borderRadius: '6px'
                        }}
                    >
                        {isScreenOn ? <Monitor size={14} /> : <MonitorOff size={14} />}
                    </button>
                </div>
            </div>

            {/* Video tiles area */}
            {hasAnyVideo && (
                <div className="video-tiles">

                    {/* ── LOCAL user tiles ───────────────────────────── */}
                    {(isVideoOn || isScreenOn) && (
                        <div className={`peer-group ${(isVideoOn && isScreenOn) ? 'has-both' : ''}`}>
                            {isVideoOn && (
                                <div
                                    className="video-tile local-tile"
                                    onClick={() => handleLocalTileClick('cam')}
                                    title="Click to expand"
                                >
                                    <video ref={localVideoRef} autoPlay muted playsInline className="video-el" />
                                    <span className="video-label">You (cam)</span>
                                    <span className="expand-hint"><Maximize2 size={10} /></span>
                                </div>
                            )}
                            {isScreenOn && (
                                <div
                                    className="video-tile screen-tile local-tile"
                                    onClick={() => handleLocalTileClick('screen')}
                                    title="Click to expand"
                                >
                                    <video ref={localScreenRef} autoPlay muted playsInline className="video-el" />
                                    <span className="video-label">You (screen)</span>
                                    <span className="expand-hint"><Maximize2 size={10} /></span>
                                </div>
                            )}
                        </div>
                    )}

                    {/* ── REMOTE peer tiles ─────────────────────────── */}
                    {remotePeerIds.map(socketId => {
                        const { camStream, screenStream, username } = remoteStreams[socketId];
                        const hasBoth = camStream && screenStream;
                        if (!camStream && !screenStream) return null;
                        return (
                            <div key={socketId} className={`peer-group ${hasBoth ? 'has-both' : ''}`}>
                                {camStream && (
                                    <RemoteVideo
                                        key={`${socketId}-cam`}
                                        stream={camStream}
                                        username={username}
                                        label={hasBoth ? `${username} (cam)` : username}
                                        kind="cam"
                                        onClick={() => handleTileClick(socketId, 'cam')}
                                    />
                                )}
                                {screenStream && (
                                    <RemoteVideo
                                        key={`${socketId}-screen`}
                                        stream={screenStream}
                                        username={username}
                                        label={hasBoth ? `${username} (screen)` : `${username}'s screen`}
                                        kind="screen"
                                        onClick={() => handleTileClick(socketId, 'screen')}
                                    />
                                )}
                            </div>
                        );
                    })}
                </div>
            )}

            {/* ── Focused / expanded tile overlay ───────────────── */}
            {focusedTile && (() => {
                let stream = null;
                let label = '';
                if (focusedTile.socketId === 'local') {
                    stream = focusedTile.kind === 'cam' ? localCamStreamRef.current : localScreenStreamRef.current;
                    label = focusedTile.kind === 'cam' ? 'You (camera)' : 'Your screen';
                } else {
                    const peer = remoteStreams[focusedTile.socketId];
                    if (peer) {
                        stream = focusedTile.kind === 'cam' ? peer.camStream : peer.screenStream;
                        label = focusedTile.kind === 'cam' ? `${peer.username} (camera)` : `${peer.username}'s screen`;
                    }
                }
                if (!stream) return null;
                return (
                    <div className="tile-focused-overlay" onClick={() => setFocusedTile(null)}>
                        <div className="tile-focused-inner" onClick={e => e.stopPropagation()}>
                            <div className="tile-focused-header">
                                <span className="tile-focused-label">{label}</span>
                                <button className="tile-focused-close" onClick={() => setFocusedTile(null)} title="Close">
                                    <X size={16} />
                                </button>
                            </div>
                            <FocusedVideo stream={stream} muted={focusedTile.socketId === 'local'} />
                        </div>
                    </div>
                );
            })()}
        </div>
    );
};

// ─── RemoteVideo ──────────────────────────────────────────────────────────────
const RemoteVideo = ({ stream, label, kind, onClick }) => {
    const videoRef = useRef(null);
    useEffect(() => {
        if (videoRef.current && stream) {
            videoRef.current.srcObject = stream;
        }
    }, [stream]);

    return (
        <div className={`video-tile ${kind === 'screen' ? 'screen-tile' : ''}`} onClick={onClick} title="Click to expand">
            <video ref={videoRef} autoPlay playsInline className="video-el" />
            <span className="video-label">{label}</span>
            <span className="expand-hint"><Maximize2 size={10} /></span>
        </div>
    );
};

// ─── FocusedVideo ─────────────────────────────────────────────────────────────
const FocusedVideo = ({ stream, muted }) => {
    const videoRef = useRef(null);
    useEffect(() => {
        if (videoRef.current && stream) {
            videoRef.current.srcObject = stream;
        }
    }, [stream]);

    return (
        <video ref={videoRef} autoPlay playsInline muted={muted} className="video-el focused-video-el" />
    );
};

export default VideoGrid;
