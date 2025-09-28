import React from 'react';
import {Route,Routes} from 'react-router-dom'
import Login from './pages/Login'
import Connections from './pages/Connections'
import Messages from './pages/Messages'
import Feed from './pages/Feed'
import Profile from './pages/Profile'
import CreatePost from './pages/CreatePost'
import ChatBox from './pages/ChatBox'
import Discover from './pages/Discover'
import {useUser, useAuth} from "@clerk/clerk-react";
import Layout from './pages/Layout';
import {Toaster} from 'react-hot-toast'
import { useEffect } from 'react';

const App = () => {
  const {user} = useUser()
  const {getToken} = useAuth()
  useEffect(()=>{ 
    if(user){
      getToken().then((token)=>console.log(token))
     }
  },[user, getToken])
  return (
    <>
    <Toaster/>
    <Routes>
<Route path='/' element={ !user ? <Login /> : <Layout/>}>
<Route index element={<Feed/>}/>
<Route path='messages' element={<Messages/>}/>
<Route path='messages/:userId' element={<ChatBox/>}/>
<Route path='Connections' element={<Connections/>}/>
<Route path='discover' element={<Discover/>}/>
<Route path='profile' element={<Profile/>}/>
<Route path='profile/:profileId' element={<Profile/>}/>
<Route path='create-post' element={<CreatePost/>}/>


</Route>

    </Routes>
    </>
  )
}
export default App;