import { motion } from 'framer-motion'

interface RemoteUser {
  userId: string
  displayName: string
  color: string
  cursorX: number
  cursorY: number
  avatarUrl?: string // Profilbild URL
}

interface RemoteCursorsProps {
  users: Map<string, RemoteUser>
  viewportX: number
  viewportY: number
  scale: number
}

export function RemoteCursors({ users, viewportX, viewportY, scale }: RemoteCursorsProps) {
  return (
    <div className="pointer-events-none fixed inset-0 overflow-hidden z-50">
      {Array.from(users.values()).map((user) => {
        // Transform canvas coordinates to screen coordinates
        const screenX = user.cursorX * scale + viewportX
        const screenY = user.cursorY * scale + viewportY
        
        return (
          <motion.div
            key={user.userId}
            className="absolute"
            initial={{ opacity: 0, scale: 0 }}
            animate={{ 
              opacity: 1, 
              scale: 1,
              x: screenX,
              y: screenY,
            }}
            exit={{ opacity: 0, scale: 0 }}
            transition={{ 
              type: 'spring',
              damping: 30,
              stiffness: 500,
              mass: 0.5,
            }}
            style={{ 
              left: 0, 
              top: 0,
            }}
          >
            {/* Cursor SVG (Apple-like) */}
            <svg
              width="20"
              height="20"
              viewBox="0 0 20 20"
              fill="none"
              style={{ filter: 'drop-shadow(0 6px 12px rgba(0,0,0,0.35))' }}
            >
              <circle
                cx="10"
                cy="10"
                r="6.5"
                fill={user.color}
                stroke="white"
                strokeWidth="1.5"
              />
              <circle
                cx="10"
                cy="10"
                r="2.5"
                fill="white"
                opacity="0.9"
              />
            </svg>
            
            {/* Avatar oder Name Label */}
            <div
              className="absolute left-5 top-4 flex items-center gap-1.5"
              style={{ filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.3))' }}
            >
              {/* Profilbild wenn vorhanden */}
              {user.avatarUrl && (
                <div 
                  className="w-6 h-6 rounded-full overflow-hidden border-2 border-white"
                  style={{ backgroundColor: user.color }}
                >
                  <img 
                    src={user.avatarUrl} 
                    alt="" 
                    className="w-full h-full object-cover"
                  />
                </div>
              )}
              
              {/* Name Label */}
              <div
                className="px-2 py-0.5 rounded text-xs font-medium text-white whitespace-nowrap"
                style={{ backgroundColor: user.color }}
              >
                {user.displayName}
              </div>
            </div>
          </motion.div>
        )
      })}
    </div>
  )
}
