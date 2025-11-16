      )}
      {/* Simple voice call overlay for DMs */}
      {callState !== 'idle' && (
        <div style={{ position: 'fixed', bottom: isMobile ? 76 : 16, left: isMobile ? 8 : 16, zIndex: 80, padding: 10, borderRadius: 10, border: '1px solid #1f2937', background: 'rgba(15,23,42,0.92)', color: '#e5e7eb', display: 'flex', alignItems: 'center', gap: 10, maxWidth: isMobile ? 'calc(100vw - 16px)' : 320 }}>
          <div>
            <div style={{ fontWeight: 600, fontSize: 13 }}>
              {callState === 'calling' ? 'Calling…' : 'In call'}
            </div>
            {callError && <div style={{ fontSize: 11, color: '#f97373' }}>{callError}</div>}
            {!callError && <div style={{ fontSize: 11, color: '#9ca3af' }}>Your microphone will be used for this DM call.</div>}
          </div>
          <audio ref={localAudioRef} autoPlay muted style={{ display: 'none' }} />
          <audio ref={remoteAudioRef} autoPlay style={{ display: 'none' }} />
          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 6 }}>
            <button
              type="button"
              className="btn-ghost"
              onClick={toggleMute}
              title={isMuted ? 'Unmute' : 'Mute'}
              style={{ padding: '4px 8px' }}
            >
              <FontAwesomeIcon icon={isMuted ? faMicrophoneSlash : faMicrophone} />
            </button>
            <button
              type="button"
              className="btn-ghost"
              onClick={ringAgain}
              title="Ring again"
              style={{ padding: '4px 8px' }}
            >
              <FontAwesomeIcon icon={faPhone} />
            </button>
            <button
              type="button"
              className="btn-ghost"
              onClick={endCall}
              title="Leave call"
              style={{ padding: '4px 8px', color: '#f97373' }}
            >
              End
            </button>
          </div>
        </div>
      )}
      {showServerSettings && (
        <ServerSettingsModal
          isOpen={showServerSettings}
          onClose={() => setShowServerSettings(false)}
          havenName={selectedHaven}
        />
      )}
      {showUserSettings && (
        <UserSettingsModal
          isOpen={showUserSettings}
          onClose={() => setShowUserSettings(false)}
          username={username}
          onStatusChange={(status) => {
            try { socketRef.current?.emit('presence', { user: username, status }); } catch {}
            setPresenceMap(prev => ({ ...prev, [username]: status }));
          }}
