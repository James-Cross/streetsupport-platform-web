import React from 'react';

import './globals.css'    // now resolves to src/app/globals.css

import { ReactNode } from 'react'
import Nav from '../components/partials/Nav'

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        <Nav />
        {children}
      </body>
    </html>
  )
}
