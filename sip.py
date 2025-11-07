




import asyncio
from livekit import api
import os




LIVEKIT_URL="wss://nye-744t963z.livekit.cloud"
LIVEKIT_API_KEY="APIbntX2RnQQ9Fj"
LIVEKIT_API_SECRET="QFal13xLhQ6xr3GnJQjHMKCmfaa1jl3irAdrff18OlwA"
PHONE_NUMBER_TO_CALL = "+9203028673105"
# Your trunk details
TRUNK_ID = "ST_bzmqX6FYgMPK"

PHONE_NUMBER_TO_CALL = "+9203028673105"
async def make_outbound_call(phone_number: str, room_name: str = None):
    """
    Make an outbound SIP call through LiveKit
    
    Args:
        phone_number: The phone number to call (E.164 format)
        room_name: Optional room name (will be auto-generated if not provided)
    """
    
    # Create LiveKit API client
    lk_api = api.LiveKitAPI(
        url=LIVEKIT_URL,
        api_key=LIVEKIT_API_KEY,
        api_secret=LIVEKIT_API_SECRET
    )
    
    # Generate room name if not provided
    if not room_name:
        room_name = f"call-{phone_number.replace('+', '')}"
    
    print(f"📞 Initiating call to {phone_number}")
    print(f"🏠 Room: {room_name}")
    
    try:
        # Create SIP participant (outbound call)
        sip_participant_info = await lk_api.sip.create_sip_participant(
            api.CreateSIPParticipantRequest(
                sip_trunk_id=TRUNK_ID,
                sip_call_to=phone_number,
                room_name=room_name,
                participant_identity=f"phone-{phone_number.replace('+', '')}",
                participant_name=f"Phone {phone_number}",
                # Optional: Add metadata
                participant_metadata="Outbound call from LiveKit",
                # krisp_enabled = True,
                # wait_until_answered = True
            )
        )
        
        print(f"✅ Call initiated successfully!")
        print(f"   Participant SID: {sip_participant_info.participant_id}")
        print(f"   Participant Identity: {sip_participant_info.participant_identity}")
        print(f"   Room Name: {sip_participant_info.room_name}")
        print(f"\n💡 The call is now active. Join the room to interact with the call.")
        print(f"   Room URL: https://innovista-s5d8vhrb.livekit.cloud/rooms/{room_name}")
        
        return sip_participant_info
        
    except Exception as e:
        print(f"❌ Error making call: {e}")
        raise
    finally:
        await lk_api.aclose()

async def list_active_rooms():
    """List all active rooms to see ongoing calls"""
    lk_api = api.LiveKitAPI(
        url=LIVEKIT_URL,
        api_key=LIVEKIT_API_KEY,
        api_secret=LIVEKIT_API_SECRET
    )
    
    try:
        rooms = await lk_api.room.list_rooms(api.ListRoomsRequest())
        print(f"\n📋 Active Rooms: {len(rooms.rooms)}")
        for room in rooms.rooms:
            print(f"   - {room.name} ({room.num_participants} participants)")
        return rooms
    except Exception as e:
        print(f"❌ Error listing rooms: {e}")
    finally:
        await lk_api.aclose()

async def end_call(room_name: str):
    """End a call by deleting the room"""
    lk_api = api.LiveKitAPI(
        url=LIVEKIT_URL,
        api_key=LIVEKIT_API_KEY,
        api_secret=LIVEKIT_API_SECRET
    )
    
    try:
        await lk_api.room.delete_room(api.DeleteRoomRequest(room=room_name))
        print(f"✅ Call ended (room {room_name} deleted)")
    except Exception as e:
        print(f"❌ Error ending call: {e}")
    finally:
        await lk_api.aclose()

async def main():
    
    room_name = "up"
    await make_outbound_call(PHONE_NUMBER_TO_CALL, room_name)
            
        

if __name__ == "__main__":
    # Run the async main function
    asyncio.run(main())



#sip demo


