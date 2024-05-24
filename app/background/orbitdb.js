import axios from "axios"

const domainApi = 'https://be.rivalz.ai'

export const saveInfoOrbit = async (
    walletAddress, ipfsMultiAddress, ipfsDbAddress, peerId, deviceId, cpuUsage, storageUsage, ramUsage,
    totalCpuCore, cpuGhz, cpuGhzMax, totalRamSize, ramMhz, internetSpeed, storageType
) => {

    const res = await axios.post(`${domainApi}/api-v1/orbit-db/save-orbit-db-info`, {
        "walletAddress": walletAddress,
        "ipfsMultiAddress": ipfsMultiAddress,
        "ipfsDbAddress": ipfsDbAddress,
        "deviceId": deviceId,
        "peerID": peerId,
        "cpuUsage": cpuUsage,
        "storageUsage": storageUsage,
        "ramUsage": ramUsage,
        "type": "rNode",
        "totalCpuCore": totalCpuCore,
        "cpuGhz": cpuGhz,
        "cpuGhzMax": cpuGhzMax || 0,
        "totalRamSize": totalRamSize,
        "ramMhz": ramMhz,
        "internetSpeed": internetSpeed,
        "storageType": storageType
    })
    return res.data
}

export const updateNodeInfo = async (peerId, ipfsMultiAddress, ipfsDbAddress, deviceId, cpuUsage, storageUsage, ramUsage) => {
    const res = await axios.post(`${domainApi}/api-v1/orbit-db/update-node-info/${deviceId}`, {
        "peerID": peerId,
        "ipfsMultiAddress": ipfsMultiAddress,
        "ipfsDbAddress": ipfsDbAddress,
        "cpuUsage": cpuUsage,
        "storageUsage": storageUsage,
        "ramUsage": ramUsage
    })
    return res.data
}

export const getPing = async (deviceId) => {
    const res = await axios.get(`${domainApi}/api-v1/orbit-db/ping/${deviceId}`)
    return res.data
}

export const myWorker = async (deviceId) => {
    const res = await axios.get(`${domainApi}/api-v1/orbit-db/find-by-device-id/${deviceId}`)
    return res.data
}

export const updateSystemInfo = async (
    deviceId, cpuUsage, storageUsage, ramUsage,totalCpuCore,cpuGhz,cpuGhzMax,totalRamSize,ramMhz,internetSpeed,storageType
    ) => {
    const res  = await axios.post(`${domainApi}/api-v1/orbit-db/update-system-info/${deviceId}`,{
        "cpuUsage": cpuUsage,
        "storageUsage": storageUsage,
        "ramUsage": ramUsage,
        "totalCpuCore": totalCpuCore,
        "cpuGhz": cpuGhz,
        "cpuGhzMax": cpuGhzMax,
        "totalRamSize": totalRamSize,
        "ramMhz": ramMhz,
        "internetSpeed": internetSpeed,
        "storageType": storageType
    })
    return res.data
}

export const getVersionApp = async() => {
    const res = await axios.get(`${domainApi}/api-v1/system/rnode-version`)
    return res.data.data
}

export const findByDeviceId = async (deviceId) => {
    const res = await axios.get(`${domainApi}/api-v1/orbit-db/find-by-device-id/${deviceId}`)
    return res.data.data
}