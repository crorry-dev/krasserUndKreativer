import { motion } from 'framer-motion'

interface RemoteUser {
  userId: string
  displayName: string
  color: string
  cursorX: number
  cursorY: number
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
            {/* Cursor SVG */}
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              style={{ filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.3))' }}
            >
              <path
                d="M5.65376 12.4561L5.65376 12.4561L12.0001 3.09836L18.3463 12.4561C18.3464 12.4562 18.3464 12.4563 18.3465 12.4564C18.5245 12.7188 18.5245 13.0611 18.3465 13.3235C18.1685 13.5859 17.8502 13.7299 17.5178 13.6867L14.0001 13.229V18.5C14.0001 19.3284 13.3285 20 12.5001 20H11.5001C10.6716 20 10.0001 19.3284 10.0001 18.5V13.229L6.48234 13.6867C6.14991 13.7299 5.83166 13.5859 5.65367 13.3235C5.47568 13.0611 5.47568 12.7188 5.65367 12.4564C5.6537 12.4563 5.65373 12.4562 5.65376 12.4561Z"
                fill={user.color}
                stroke="white"
                strokeWidth="1.5"
              />
            </svg>
            
            {/* Name label */}
            <div
              className="absolute left-5 top-4 px-2 py-0.5 rounded text-xs font-medium text-white whitespace-nowrap"
              style={{ backgroundColor: user.color }}
            >
              {user.displayName}
            </div>
          </motion.div>
        )
      })}
    </div>
  )
}
