import {ShareableWebsocket} from "../../lib/shared-tab-ws.ts";

const urlParams = new URLSearchParams(window.location.search);
const namespace = urlParams.get('ns') || 'default';

const ns = document.querySelector('#ns')
const pageWrapper = document.querySelector('#page-wrapper')

if (ns) ns.innerHTML = namespace

let i = 0;
let controller: AbortController;
let a: ShareableWebsocket

async function init() {
    controller = new AbortController()
    a = new ShareableWebsocket({url: 'ws://localhost:8282'}, {namespace: namespace})

    await a.isReady()
    const ul = document.querySelector('#messages')

    function ongMsg(ev: any) {
        console.log(ev)
        if (!ul) {
            console.log('element not found')
            return
        }
        if (i == 10) {
            i = 0
            const list = document.querySelectorAll('ul li');
            if (list) {
                list.forEach((value) => value.remove())
            }
        }
        i++
        const liEl = document.createElement('li')
        liEl.innerText = `index ${i} message ${ev.data}`
        ul.append(liEl)
    }


    setInterval(() => {
        if (pageWrapper) pageWrapper.className = a.isLeader() ? 'wrapper master' : 'wrapper'
    }, 1000)

    a.getConnection().addEventListener("message", ongMsg, {signal: controller.signal})

    a.getConnection().addEventListener("close", () => {
        console.log('closed')
    })
    a.getConnection().addEventListener("open", () => {
        console.log('opened')
    })

}

document.querySelector('#send')?.addEventListener('click', () => {
    const element: HTMLInputElement = <any>document.querySelector('#message');
    const msg = element?.value || 'empty'
    a.getConnection().send(msg)
})


document.querySelector('#connect')?.addEventListener('click', () => {
    init()
})

document.querySelector('#close')?.addEventListener('click', () => {
    a.close()
})

document.querySelector('#cancel')?.addEventListener('click', () => {
    controller.abort()
})
