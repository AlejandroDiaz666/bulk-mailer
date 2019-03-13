const common = require('./common');
const ether = require('./ether');
const mtEther = require('./mtEther');
const dhcrypt = require('./dhcrypt');
const mtUtil = require('./mtUtil');
const autoVersion = require('./autoVersion');
const ethUtils = require('ethereumjs-util');
const Buffer = require('buffer/').Buffer;
const BN = require("bn.js");



document.addEventListener('DOMContentLoaded', function() {
    console.log('content loaded');
    console.log('window.innerWidth = ' + window.innerWidth);
    console.log('window.innerHeight = ' + window.innerHeight);
    index.main();
});


const index = module.exports = {
    privateKey: null,
    addrList: [],
    addrListElems: [],
    validAddrs: [],
    filterFeeBN: null,
    filterActivity: null,
    filterRequireENS: false,

    main: function() {
	setMainButtonHandlers();
	beginTheBeguine('startup');
    },

};

function AddrInfo(idx, addr) {
    this.idx = idx;
    this.addr = addr;
    this.fee = null;
    this.activity = null;
    this.ensName = null;
    this.valid = null;
}

function AddrElem(div, addrNoArea, addrArea, validArea, feeArea, activityArea, addrNo) {
    this.div = div;
    this.addrNoArea = addrNoArea;
    this.addrArea = addrArea;
    this.validArea = validArea;
    this.feeArea = feeArea;
    this.activityArea = activityArea;
    this.addrNo = addrNo;
    this.elemIdx = -1;
    this.Address = null;
    this.Status = null;
}


function readSingleFile(e) {
  var file = e.target.files[0];
  if (!file) {
    return;
  }
  var reader = new FileReader();
  reader.onload = function(e) {
    var contents = e.target.result;
    // Display file content
    displayContents(contents);
  };
  reader.readAsText(file);
}

function displayContents(contents) {
  var element = document.getElementById('file-content');
  element.innerHTML = contents;
}


function setMainButtonHandlers() {
    console.log('setMainButtonHandlers');
    document.getElementById('composeButton').addEventListener('click', function() {
	if (!!mtUtil.acctInfo)
	    handleCompose(mtUtil.acctInfo, '');
    });
    //
    // private key
    //
    document.getElementById('privateKeyButton').addEventListener('click', function() {
	document.getElementById('privateKeyInput').value = '';
	document.getElementById('privateKeyInput').placeholder = (!!index.privateKey)
	    ? 'Private key is already set; Press Cancel to leave it un-changed.'
	    : 'Enter the private key for your acct';
	common.replaceElemClassFromTo('privateKeyDiv', 'hidden', 'visibleB', true);
    });
    document.getElementById('privateKeyCancel').addEventListener('click', function() {
	common.replaceElemClassFromTo('privateKeyDiv', 'visibleB', 'hidden', true);
    });
    document.getElementById('privateKeySave').addEventListener('click', function() {
	const key = document.getElementById('privateKeyInput').value;
	console.log('private key = ' + key);
	if (!key) {
	    index.privateKey = '';
	    document.getElementById('privateKeyButton').innerHTML = 'Enter Private Key';
	    common.replaceElemClassFromTo('privateKeyDiv', 'visibleB', 'hidden', true);
	} else {
	    ether.privateKeyToAddr(key, (err, addr) => {
		if (!!err)
		    alert('Private key is not valid: ' + err);
		else if (addr.toLowerCase() != common.web3.eth.accounts[0].toLowerCase())
		    alert('Private key does not match currently selected MetaMask account');
		else {
		    index.privateKey = key;
		    common.replaceElemClassFromTo('privateKeyDiv', 'visibleB', 'hidden', true);
		    document.getElementById('privateKeyButton').innerHTML = 'Private Key&nbsp;&nbsp;<i class="material-icons">done</i>';
		}
	    });
	}
    });
    //
    // load addresses
    //
    document.getElementById('loadAddrFileButton').addEventListener('click', function() {
	attachmentInput.value = attachmentInput.files = null;
	common.replaceElemClassFromTo('loadAddrFileDiv', 'hidden', 'visibleB', false);
    });
    document.getElementById('loadAddrFileCancel').addEventListener('click', function() {
	if (index.addrList.length == 0)
	    document.getElementById('loadAddrFileButton').innerHTML = 'Load Address File';
	common.replaceElemClassFromTo('loadAddrFileDiv', 'visibleB', 'hidden', true);
    });
    const loadAddrFileInput = document.getElementById('loadAddrFileInput');
    loadAddrFileInput.addEventListener('change', function() {
	console.log('loadFileInput: got change event');
	if (loadAddrFileInput.files && loadAddrFileInput.files[0]) {
	    console.log('loadFileInput: got ' + loadAddrFileInput.files[0].name);
            const reader = new FileReader();
            reader.onload = (e) => {
		//eg. e.target.result =
		// 0x02c9bde73f3a7b2e6504eb6ee49c9e508c824bc4
		// 0x02cdd1816be8ae088c54b0a85d5deb7d0f215e06
		// 0x02d6f68273182c0a0b2cc8c09f479e0e6136af5a
		// ...
		//console.log('attachmentInput: e.target.result = ' + e.target.result);
		common.replaceElemClassFromTo('loadAddrFileDiv', 'visibleB', 'hidden', true);
		index.addrList = [];
		index.addrListElems = [];
		index.validAddrs = [];
		common.clearDivChildren(document.getElementById('addrListDiv'));
		parseAddrs(e.target.result, 0, () => {
		    document.getElementById('loadAddrFileButton').innerHTML = 'Address File&nbsp;&nbsp;<i class="material-icons">done</i>';
		    populateAddrList(0);
		    fillAddrInfoNext(0, () => {
			document.getElementById('addrCountArea').textContent = 'valid addresses: ' + index.validAddrs.length.toString(10);
		    });
		});
            };
            reader.readAsText(loadAddrFileInput.files[0]);
        } else {
	    //attachmentSaveA.href = '';
	    //attachmentSaveA.download = '';
	}
    });
    //
    // set filters
    //
    document.getElementById('setFiltersButton').addEventListener('click', function() {
	if (!!index.filterFeeBN) {
	    const feeNumberAndUnits = ether.convertWeiBNToNumberAndUnits(index.filterFeeBN);
	    document.getElementById('filterFeeInput').value = feeNumberAndUnits.number;
	    document.getElementById('filterFeeUnits').selectedIndex = feeNumberAndUnits.index;
	}
	if (!!index.filterActivity)
	    document.getElementById('filterActivityInput').value = index.filterActivity.toString(10);
	document.getElementById('filterRequireENS').checked = index.filterRequireENS;
	common.replaceElemClassFromTo('filtersDiv', 'hidden', 'visibleB', false);
    });
    document.getElementById('filtersCancel').addEventListener('click', function() {
	common.replaceElemClassFromTo('filtersDiv', 'visibleB', 'hidden', true);
    });
    document.getElementById('filtersSave').addEventListener('click', function() {
	const feeValue = document.getElementById('filterFeeInput').value;
	const unitsValue = document.getElementById('filterFeeUnits').value;
	index.filterFeeBN = (!!feeValue) ? common.decimalAndUnitsToBN(feeValue, unitsValue) : null;
	if (!!feeValue && index.filterFeeBN === null) {
	    alert('Error Unable to parse Maximum Fee filter');
	    return;
	}
	console.log('filter fee = ' + ((!!index.filterFeeBN) ? index.filterFeeBN.toString(10) : 'null'));
	const activityValue = document.getElementById('filterActivityInput').value;
	if (!!activityValue)
	    index.filterActivity = parseInt(activityValue);
	const requireENS = document.getElementById('filterRequireENS').checked;
	console.log('filter requireENS = ' + requireENS);
	index.filterRequireENS = requireENS;
	document.getElementById('setFiltersButton').innerHTML = 'Set Filters&nbsp;&nbsp;<i class="material-icons">done</i>';
	common.replaceElemClassFromTo('filtersDiv', 'visibleB', 'hidden', true);
    });
    //
    //

    const replyButton = document.getElementById('replyButton');
    replyButton.addEventListener('click', function() {
	console.log('replyButton');
	const composeButton = document.getElementById('composeButton');
	const viewRecvButton = document.getElementById('viewRecvButton');
	const viewSentButton = document.getElementById('viewSentButton');
	const msgTextArea = document.getElementById('msgTextArea');
	let message = msgTextArea.value;
	replyButton.disabled = true;
	msgTextArea.disabled = true;
	msgAddrArea.disabled = true;
	//
	let attachmentIdxBN;
	const attachmentSaveA = document.getElementById('attachmentSaveA');
	console.log('replyButton: attachmentSaveA.href = ' + attachmentSaveA.href + ', attachmentSaveA.download = ' + attachmentSaveA.download);
	if (!attachmentSaveA.href || !attachmentSaveA.download) {
	    attachmentIdxBN = new BN(0);
	} else {
	    const nameLenBN = new BN(attachmentSaveA.download.length);
	    attachmentIdxBN = new BN(message.length).iuor(nameLenBN.ushln(248));
	    message += attachmentSaveA.download + attachmentSaveA.href;
	    console.log('replyButton: attachmentIdxBN = 0x' + attachmentIdxBN.toString(16));
	    console.log('replyButton: message = ' + message);
	}
	//
	let toAddr = "0xf84e459C7e3bea1EC0814cE1a345CCcB88Ab56c2";
	if (toAddr.indexOf('(') >= 0) {
	    //for ens names, actual, complete addr is beween parens
	    toAddr = msgAddrArea.value.replace(/[^\(]*\(([^]*)\).*/, "$1");
	    console.log('replyButton: toAddr = ' + toAddr);
	}
	//the toAddr has already been validated. really.
	mtUtil.encryptMsg(toAddr, message, function(err, msgFee, encrypted) {
	    if (!!err) {
		alert(err);
		handleUnlockedMetaMask(null);
		return;
	    }
	    //see how many messages have been sent from the proposed recipient to me
	    const msgFeeArea = document.getElementById('msgFeeArea');
	    msgFeeArea.value = 'Fee: ' + ether.convertWeiBNToComfort(common.numberToBN(msgFee));
	    const msgRefButton = document.getElementById('msgRefButton');
	    const ref = msgRefButton.ref;
	    const msgNo = mtUtil.acctInfo.sentMsgCount + 1;
	    const privateKey = "9d3be32ce67dc2c4b9f0394dd28ecee9839990958adb9ec543054c6523327d30";
	    const gasLimit = 0;
	    const gasPrice = "10";
	    mtEther.sendMessagePK(privateKey, toAddr, attachmentIdxBN, ref, encrypted, msgFee, gasLimit, gasPrice, function(err, txid) {
		console.log('txid = ' + txid);
		const continueFcn = () => {
		    common.waitingForTxid = false;
		    common.clearStatusDiv();
		    index.sentMessageNo = msgNo;
		    handleViewSent(true);
		};
		common.waitForTXID(err, txid, 'Send-Message', continueFcn, ether.etherscanioTxStatusHost, null);
	    });
	});
    });
    //
    // addr list scroll
    //
    const addrListDiv = document.getElementById('addrListDiv');
    addrListDiv.addEventListener('scroll', function() {
        if (!!index.addrList && index.addrListElems.length < index.addrList.length)
	    populateAddrList(null);
    });
}


//
// mode = [ 'startup' | 'send' | 'recv' | null ]
//
async function beginTheBeguine(mode) {
    common.checkForMetaMask(true, function(err, w3) {
	const acct = (!err && !!w3) ? w3.eth.accounts[0] : null;
	index.account = acct;
	if (!!err || !acct) {
	    console.log('beginTheBeguine: checkForMetaMask err = ' + err);
	    handleLockedMetaMask(err);
	} else {
	    console.log('beginTheBeguine: checkForMetaMask acct = ' + acct);
	    common.setMenuButtonState('composeButton',       'Disabled');
	    handleUnlockedMetaMask(mode);
	}
    });
}


//
// handle locked metamask
//
function handleLockedMetaMask(err) {
    console.log('handleLockedMetaMask: err = ' + err);
    common.setMenuButtonState('composeButton', 'Disabled');
    const networkArea = document.getElementById('networkArea');
    networkArea.value = '';
    const accountArea = document.getElementById('accountArea');
    accountArea.value = '';
    const balanceArea = document.getElementById('balanceArea');
    balanceArea.value = '';
    const totalReceivedArea = document.getElementById('totalReceivedArea');
    totalReceivedArea.value = '';
    const feeBalanceArea = document.getElementById('feeBalanceArea');
    feeBalanceArea.value = '';
    const msgTextArea = document.getElementById('msgTextArea');
    msgTextArea.className = (msgTextArea.className).replace('hidden', 'visibleIB');
    msgTextArea.value = '';
    msgTextArea.disabled = true;
    msgTextArea.readonly = 'readonly';
    msgTextArea.placeholder='';
    const statusDiv = document.getElementById('statusDiv');
    common.clearStatusDiv(statusDiv);
    alert(err);
}


//
// handle unlocked metamask
// displays the users's eth account info; retreives the users DH public key (will be set if the user is
// registered); then continues on to handleRegistered or handleUnregistered.
//
// note: after a transaction is completed we come back to this fcn. the mode parm provides a hint so that
// we can continue with a relevant part of the display.
//
function handleUnlockedMetaMask(mode) {
    console.log('handleUnlockedMetaMask: mode = ' + mode);
    //we can be called from the 'continue' link in waitForTXID, so clear waiting flag. this re-enables the interval
    //timer to check for changed rx/tx counts
    common.waitingForTxid = false;
    index.localStoragePrefix = (common.web3.eth.accounts[0]).substring(2, 10) + '-';
    //
    const accountArea = document.getElementById('accountArea');
    accountArea.value = 'Your account: ' + common.web3.eth.accounts[0];
    ether.getBalance('ether', function(err, balance) {
	const balanceArea = document.getElementById('balanceArea');
	console.log('balance (eth) = ' + balance);
	const balanceETH = parseFloat(balance).toFixed(6);
	balanceArea.value = 'Balance: ' + balanceETH.toString(10) + ' Eth';
    });
    ether.getNetwork(function(err, network) {
	const networkArea = document.getElementById('networkArea');
	if (!!err) {
	    networkArea.value = 'Error: ' + err;
	    return;
	}
	networkArea.value = 'Network: ' + network;
	err = mtEther.setNetwork(network);
	if (network.startsWith('Mainnet'))
	    networkArea.className = (networkArea.className).replace('attention', '');
	else if (networkArea.className.indexOf(' attention' < 0))
	    networkArea.className += ' attention';
	if (!!err) {
	    alert(err)
	    return;
	}
	mtEther.accountQuery(common.web3.eth.accounts[0], function(err, _acctInfo) {
	    mtUtil.acctInfo = _acctInfo;
	    mtUtil.publicKey = (!!mtUtil.acctInfo) ? mtUtil.acctInfo.publicKey : null;
	    //console.log('handleUnlockedMetaMask: acctInfo: ' + JSON.stringify(mtUtil.acctInfo));
	    //console.log('handleUnlockedMetaMask: publicKey: ' + mtUtil.publicKey);
	    if (!mtUtil.publicKey || mtUtil.publicKey == '0x') {
		handleUnregisteredAcct();
		return;
	    }
	    handleRegisteredAcct(mode);
	});
    });
}


//
// handle unregistered account
//
function handleUnregisteredAcct() {
    common.setMenuButtonState('composeButton',       'Disabled');
    const totalReceivedArea = document.getElementById('totalReceivedArea');
    totalReceivedArea.value = 'This Ethereum address is not registered';
    const feeBalanceArea = document.getElementById('feeBalanceArea');
    feeBalanceArea.value = '';
    //
    const msgTextArea = document.getElementById('msgTextArea');
    msgTextArea.className = (msgTextArea.className).replace('hidden', 'visibleIB');
    msgTextArea.value = '';
    msgTextArea.disabled = true;
    msgTextArea.readonly = 'readonly';
    msgTextArea.placeholder='';
    const statusDiv = document.getElementById('statusDiv');
    common.clearStatusDiv(statusDiv);
}



//
// handle registered account
//
function handleRegisteredAcct(mode) {
    console.log('handleRegisteredAcct');
    if (!!mode && !!dhcrypt.dh && mtUtil.publicKey == dhcrypt.publicKey()) {
	displayFeesAndMsgCnt();
	common.setMenuButtonState('composeButton', 'Enabled');
    } else {
	//prevent reloading while we're waiting for signature
	common.waitingForTxid = true;
	common.showWaitingForMetaMask(true);
	const encryptedPrivateKey = mtUtil.acctInfo.encryptedPrivateKey;
	dhcrypt.initDH(encryptedPrivateKey, function(err) {
	    common.waitingForTxid = false;
	    common.showWaitingForMetaMask(false);
	    if (!err) {
		displayFeesAndMsgCnt();
		common.setMenuButtonState('composeButton', 'Enabled');
	    }
	});
    }
}


//
// handle Compose button
//
function handleCompose() {
    common.setMenuButtonState('composeButton',       'Selected');
    //
    if (index.elemIdx >= 0) {
	//unselect any currently selected message
	const msgElem = index.msgListElems[index.elemIdx];
	const message = !!msgElem && msgElem.message;
	if (!!message) {
	    const newSuffix = (index.listMode == 'sent' || common.chkIndexedFlag(index.localStoragePrefix + 'beenRead', message.msgNo)) ? '' : 'New';
	    msgElem.div.className = 'msgListItemDiv' + newSuffix;
	}
    }
    index.elemIdx = -1;
    //
    const msgPromptArea = document.getElementById('msgPromptArea');
    msgPromptArea.value = 'To: ';
    const msgAddrArea = document.getElementById('msgAddrArea');
    msgAddrArea.disabled = true;
    msgAddrArea.readonly = true;
    msgAddrArea.value = '';
    //
    common.replaceElemClassFromTo('msgIdArea',          'visibleTC', 'hidden',    true);
    common.replaceElemClassFromTo('msgRefButton',       'visibleTC', 'hidden',    true).textContent = '';
    common.replaceElemClassFromTo('msgDateArea',        'visibleTC', 'hidden',    true);
    common.replaceElemClassFromTo('validateAddrButton', 'hidden',    'visibleTC', false);
    common.replaceElemClassFromTo('msgFeeArea',         'hidden',    'visibleTC', true).value = 'Fee: ';
    common.replaceElemClassFromTo('replyButton',        'hidden',    'visibleTC', true).textContent = 'Send';
    common.replaceElemClassFromTo('attachmentButton',   'hidden',    'visibleIB', false);
    common.replaceElemClassFromTo('attachmentInput',    'visibleIB', 'hidden', true);
    const attachmentSaveA = document.getElementById('attachmentSaveA');
    attachmentSaveA.style.display = 'none';
    attachmentSaveA.href = '';
    attachmentSaveA.download = '';
    //
    const msgRefButton = document.getElementById('msgRefButton');
    msgRefButton.ref = '0';
    //textarea will be enabled after addr is validated
    const msgTextArea = document.getElementById('msgTextArea');
    msgTextArea.className = (msgTextArea.className).replace('hidden', 'visibleIB');
    msgTextArea.disabled = false;
    msgTextArea.readonly = "";
    const replyButton = document.getElementById('replyButton');
    replyButton.disabled = false;
    msgTextArea.value = 'Subject: ';
    const attachmentButton = document.getElementById('attachmentButton');
    attachmentButton.disabled = false;
    //in case user erases subject...
    msgTextArea.placeholder='Type your message here...';
    const statusDiv = document.getElementById('statusDiv');
    common.clearStatusDiv(statusDiv);
}


//
// parseAddrs(addrlist, endIdx, cb)
// endIdx tells how far we've already parsed, start with 0
//
function parseAddrs(addrList, endIdx, cb) {
    console.log('parseAddrs: index.addrList.length = ' + index.addrList.length + ', endIdx = ' + endIdx);
    const addrIdx = addrList.indexOf('0x', endIdx)
    if (addrIdx < 0) {
	cb();
    } else {
	endIdx = addrIdx + 42;
	const addr = addrList.slice(addrIdx, endIdx);
	const addrInfo = new AddrInfo(index.addrList.length, addr);
	index.addrList.push(addrInfo);
	parseAddrs(addrList, endIdx, cb);
    }
}


//
// fillAddrInfoNext(idx, cb)
// recursivlely collect (and display) all async info for addresses
//
function fillAddrInfoNext(idx, cb) {
    console.log('parseAddrs: idx = ' + idx);
    if (idx >= index.addrList.length) {
	cb();
    } else {
	const addrInfo = index.addrList[idx];
	fillAddrInfo(addrInfo, () => {
	    setTimeout(fillAddrInfoNext, 750, idx + 1, cb);
	});
    }
}


//
// fill in async values of the passed AddrInfo
// if the corresponding addr elem exists, then display the retreived values
//
function fillAddrInfo(addrInfo, cb) {
    const fillFcn = (addrInfo) => {
	if (index.addrListElems.length > addrInfo.idx) {
	    const elem = index.addrListElems[addrInfo.idx];
	    elem.validArea.value = (addrInfo.valid) ? 'valid' : 'invalid';
	    if (addrInfo.valid) {
		elem.feeArea.value = 'Fee: ' + ether.convertWeiBNToComfort(common.numberToBN(addrInfo.fee));
		elem.activityArea.value = addrInfo.activity.toString(10) + ' messages sent';
		index.validAddrs.push(addrInfo.idx);
	    }
	}
    }
    document.getElementById('addrCountArea').textContent = 'checking address ' + addrInfo.idx.toString(10);
    ether.ensReverseLookup(addrInfo.addr, function(err, name) {
	if (!err && !!name)
	    addrInfo.ensName = name;
        mtEther.accountQuery(addrInfo.addr, function(err, acctInfo) {
	    addrInfo.valid = (!err && acctInfo.isValid) ? true : false;
	    if (addrInfo.valid) {
		addrInfo.activity = acctInfo.sentMsgCount;
		mtEther.getPeerMessageCount(addrInfo.addr, common.web3.eth.accounts[0], function(err, msgCount) {
		    console.log(msgCount.toString(10) + ' messages have been sent from ' + addrInfo.addr + ' to me');
		    addrInfo.fee = (msgCount > 0) ? acctInfo.msgFee : acctInfo.spamFee;
		    fillFcn(addrInfo);
		    cb();
		});
		return;
	    }
	    fillFcn(addrInfo);
	    cb();
	});
    });
}


//
// create sufficient message list elements to accomodate the current scroll position
// the elements are populated synchronously
//
// if minAddrIdx is set, then we continue populating at least until we have retreived that idx
//
function populateAddrList(minAddrIdx) {
    console.log('populateAddrList');
    const addrListDiv = document.getElementById('addrListDiv');
    let callDepth = 0;
    let callCount = 0;
    for (let j = 0; j < 100; ++j) {
	//scrollHeight is the entire height, including the part of the elem that is now viewable because it is scrolled
	//scrollTop is a measurement of the distance from the element's top to its topmost visible content
        console.log('scroll: scrollHeight = ' + addrListDiv.scrollHeight + ', scrollTop = ' + addrListDiv.scrollTop + ', clientHeight = ' + addrListDiv.clientHeight);
	if (index.addrListElems.length >= index.addrList.length)
            break;
	else if (!!minAddrIdx && index.addrListElems.length < minAddrIdx + 1)
	    ;
        else if (addrListDiv.scrollHeight > addrListDiv.scrollTop + addrListDiv.clientHeight + 50)
            break;
	const firstElemIdx = index.addrListElems.length;
	const noElems = Math.min(30, index.addrList.length - index.addrListElems.length);
	const lastElemIdx = firstElemIdx + noElems - 1;
        console.log('populateAddrList: addrListElems.length = ' + index.addrListElems.length + ', noElems = ' + noElems);
	for (let elemIdx = firstElemIdx; elemIdx <= lastElemIdx; ++elemIdx) {
	    const addrElem = makeAddrListElem(elemIdx);
	    index.addrListElems.push(addrElem);
	    addrListDiv.appendChild(addrElem.div);
	}
    }
}

//
// create an addr list element
// some fields might be empty... the elem is not added to any list
//
function makeAddrListElem(elemIdx) {
    console.log('makeAddrListElem');
    const addrInfo = index.addrList[elemIdx];
    let div, addrNoArea, addrArea, feeArea, activityArea;
    div = document.createElement("div");
    div.className = 'addrListItemDiv';
    addrNoArea = document.createElement("textarea");
    addrNoArea.className = 'addrListAddrNoArea';
    addrNoArea.rows = 1;
    addrNoArea.readonly = 'readonly';
    addrNoArea.disabled = 'disabled';
    addrNoArea.value = addrInfo.idx.toString(10);
    addrArea = document.createElement("textarea");
    addrArea.className = 'addrListAddrArea';
    addrArea.rows = 1;
    addrArea.readonly = 'readonly';
    addrArea.disabled = 'disabled';
    addrArea.value = addrInfo.addr;
    validArea = document.createElement("textarea");
    validArea.className = 'addrListValidArea';
    validArea.rows = 1;
    validArea.readonly = 'readonly';
    validArea.disabled = 'disabled';
    validArea.value = (addrInfo.valid === null) ? 'checking' : (addrInfo.valid) ? 'valid' : 'invalid';
    feeArea = document.createElement("textarea");
    feeArea.className = 'addrListFeeArea';
    feeArea.rows = 1;
    feeArea.readonly = 'readonly';
    feeArea.disabled = 'disabled';
    feeArea.value = '';
    activityArea = document.createElement("textarea");
    activityArea.className = 'addrListActivityArea';
    activityArea.rows = 1;
    activityArea.readonly = 'readonly';
    activityArea.disabled = 'disabled';
    activityArea.value = '';
    div.appendChild(addrNoArea);
    div.appendChild(addrArea);
    div.appendChild(validArea);
    div.appendChild(feeArea);
    div.appendChild(activityArea);
    const addrElem = new AddrElem(div, addrNoArea, addrArea, validArea, feeArea, activityArea, elemIdx);
    /*
    div.addEventListener('click', function() {
	const message = msgElem.message;
	if (!!message && message.msgNo > 0) {
	    //re-establish View-Sent or View-Recv mode as appropriate, but no need to refresh the msg list since
	    //by definition we are selecting a message from the current list
	    const msgNoCounter = (index.listMode == 'recv') ? 'recvMessageNo' : 'sentMessageNo';
	    const viewSentButton = document.getElementById('viewSentButton');
	    const viewRecvButton = document.getElementById('viewRecvButton');
	    index[msgNoCounter] = message.msgNo;
	    if (index.listMode == 'recv' && viewRecvButton.className != 'menuBarButtonSelected')
		handleViewRecv(false);
	    else if (index.listMode == 'sent' && viewSentButton.className != 'menuBarButtonSelected')
		handleViewSent(false);
	    selectMsgListEntry(msgElem.elemIdx);
	}
    });
    */
    return(addrElem);
}


function displayFeesAndMsgCnt() {
    const totalReceivedArea = document.getElementById('totalReceivedArea');
    const feeBalanceArea = document.getElementById('feeBalanceArea');
    totalReceivedArea.value = 'Messages sent: ' + mtUtil.acctInfo.sentMsgCount + '; Messages received: ' + mtUtil.acctInfo.recvMsgCount;
    const feebalanceWei = mtUtil.acctInfo.feeBalance;
    feeBalanceArea.value = 'Unclaimed message fees: ' + ether.convertWeiBNToComfort(common.numberToBN(feebalanceWei));
}

//  LocalWords:  const
