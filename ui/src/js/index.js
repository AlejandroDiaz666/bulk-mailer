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
    recipients: [],
    filterFeeBN: null,
    filterBalanceBN: null,
    filterActivity: null,
    filterRequireENS: false,
    noAddrsMsg: null,
    totalFeesBN: null,

    main: function() {
	setMainButtonHandlers();
	beginTheBeguine('startup');
    },

};

function AddrInfo(idx, addr) {
    this.idx = idx;
    this.addr = addr;
    this.feeBN = null;
    this.balanceBN = null;
    this.activity = null;
    this.ensName = null;
    this.valid = null;
}

function AddrElem(div, addrNoArea, addrArea, validArea, feeArea, balanceArea, activityArea, sendArea, addrNo) {
    this.div = div;
    this.addrNoArea = addrNoArea;
    this.addrArea = addrArea;
    this.validArea = validArea;
    this.feeArea = feeArea;
    this.balanceArea = balanceArea;
    this.activityArea = activityArea;
    this.sendArea = sendArea;
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
    //
    // private key
    //
    console.log('setMainButtonHandlers');
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
		    common.setMenuButtonState('loadAddrFileButton', 'Enabled');
		    const msg = (index.addrList.length > 0) ? index.noAddrsMsg : 'You need to load an address file...';
		    showStatus(msg);
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
		index.recipients = [];
		common.clearDivChildren(document.getElementById('addrListDiv'));
		parseAddrs(e.target.result, 0, () => {
		    document.getElementById('loadAddrFileButton').innerHTML = 'Address File&nbsp;&nbsp;<i class="material-icons">done</i>';
		    populateAddrList(0);
		    fillAddrInfoNext(0, () => {
			common.setMenuButtonState('setFiltersButton', 'Enabled');
			index.noAddrsMsg = 'number of addresses: ' + index.addrList.length.toString(10) + ' (' + index.validAddrs.length.toString(10) + ' valid)';
			document.getElementById('setFiltersButton').innerHTML = 'Set Filters';
			showStatus(index.noAddrsMsg + ' | you must set filters');
			//document.getElementById('addrCountArea').textContent = 'valid addresses: ' + ;
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
	if (!!index.filterBalanceBN) {
	    const balanceNumberAndUnits = ether.convertWeiBNToNumberAndUnits(index.filterBalanceBN);
	    document.getElementById('filterBalanceInput').value = balanceNumberAndUnits.number;
	    document.getElementById('filterBalanceUnits').selectedIndex = balanceNumberAndUnits.index;
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
	const feeUnitsValue = document.getElementById('filterFeeUnits').value;
	index.filterFeeBN = (!!feeValue) ? common.decimalAndUnitsToBN(feeValue, feeUnitsValue) : null;
	if (!!feeValue && index.filterFeeBN === null) {
	    alert('Error Unable to parse Maximum Fee filter');
	    return;
	}
	console.log('filter fee = ' + ((!!index.filterFeeBN) ? index.filterFeeBN.toString(10) : 'null'));
	const balanceValue = document.getElementById('filterBalanceInput').value;
	const balanceUnitsValue = document.getElementById('filterBalanceUnits').value;
	index.filterBalanceBN = (!!balanceValue) ? common.decimalAndUnitsToBN(balanceValue, balanceUnitsValue) : null;
	if (!!balanceValue && index.filterBalanceBN === null) {
	    alert('Error Unable to parse Minimum Balance filter');
	    return;
	}
	console.log('filter balance = ' + ((!!index.filterBalanceBN) ? index.filterBalanceBN.toString(10) : 'null'));
	const activityValue = document.getElementById('filterActivityInput').value;
	if (!!activityValue)
	    index.filterActivity = parseInt(activityValue);
	const requireENS = document.getElementById('filterRequireENS').checked;
	console.log('filter requireENS = ' + requireENS);
	index.filterRequireENS = requireENS;
	document.getElementById('setFiltersButton').innerHTML = 'Set Filters&nbsp;&nbsp;<i class="material-icons">done</i>';
	showStatus(index.noAddrsMsg + ' | filters set');
	common.replaceElemClassFromTo('filtersDiv', 'visibleB', 'hidden', true);
	findRecipients(() => initMsgArea(true));
    });
    //
    // send
    //
    document.getElementById('sendButton').addEventListener('click', function() {
	document.getElementById('msgTextArea').disabled = true;
	document.getElementById('attachmentButton').disabled = true;
	common.setMenuButtonState('privateKeyButton',   'Disabled');
	common.setMenuButtonState('loadAddrFileButton', 'Disabled');
	common.setMenuButtonState('setFiltersButton',   'Disabled');
	common.setMenuButtonState('sendButton',         'Disabled');
	let message = document.getElementById('msgTextArea').value;
	let attachmentIdxBN;
	const attachmentSaveA = document.getElementById('attachmentSaveA');
	console.log('send: attachmentSaveA.href = ' + attachmentSaveA.href + ', attachmentSaveA.download = ' + attachmentSaveA.download);
	if (!attachmentSaveA.href || !attachmentSaveA.download) {
	    attachmentIdxBN = new BN(0);
	} else {
	    const nameLenBN = new BN(attachmentSaveA.download.length);
	    attachmentIdxBN = new BN(message.length).iuor(nameLenBN.ushln(248));
	    message += attachmentSaveA.download + attachmentSaveA.href;
	    console.log('send: attachmentIdxBN = 0x' + attachmentIdxBN.toString(16));
	    console.log('send: message = ' + message);
	}
	//
	sendRecipients(0, message, attachmentIdxBN, function() {
	    document.getElementById('msgTextArea').disabled = false;
	    document.getElementById('attachmentButton').disabled = false;
	    common.setMenuButtonState('privateKeyButton',   'Enabled');
	    common.setMenuButtonState('loadAddrFileButton', 'Enabled');
	    common.setMenuButtonState('setFiltersButton',   'Enabled');
	    common.setMenuButtonState('sendButton',         'Enabled');
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
    common.setMenuButtonState('privateKeyButton',   'Disabled');
    common.setMenuButtonState('loadAddrFileButton', 'Disabled');
    common.setMenuButtonState('setFiltersButton',   'Disabled');
    common.setMenuButtonState('sendButton',         'Disabled');
    common.checkForMetaMask(true, function(err, w3) {
	const acct = (!err && !!w3) ? w3.eth.accounts[0] : null;
	index.account = acct;
	if (!!err || !acct) {
	    console.log('beginTheBeguine: checkForMetaMask err = ' + err);
	    handleLockedMetaMask(err);
	} else {
	    console.log('beginTheBeguine: checkForMetaMask acct = ' + acct);
	    handleUnlockedMetaMask(mode);
	}
    });
}


//
// handle locked metamask
//
function handleLockedMetaMask(err) {
    console.log('handleLockedMetaMask: err = ' + err);
    common.setMenuButtonState('sendButton', 'Disabled');
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
    ether.getBalance(common.web3.eth.accounts[0], 'ether', function(err, balance) {
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
    common.setMenuButtonState('sendButton', 'Disabled');
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
    } else {
	//prevent reloading while we're waiting for signature
	common.waitingForTxid = true;
	common.showWaitingForMetaMask(true);
	const encryptedPrivateKey = mtUtil.acctInfo.encryptedPrivateKey;
	dhcrypt.initDH(encryptedPrivateKey, function(err) {
	    common.waitingForTxid = false;
	    common.showWaitingForMetaMask(false);
	    if (!err) {
		initMsgArea(false);
		showStatus('Begin by entering your private key...');
		common.setMenuButtonState('privateKeyButton',   'Enabled');
		common.setMenuButtonState('loadAddrFileButton', 'Disabled');
		common.setMenuButtonState('setFiltersButton',   'Disabled');
		common.setMenuButtonState('sendButton',         'Disabled');
	    }
	});
    }
}


//
// initMsgArea(enable)
//
function initMsgArea(enable) {
    console.log('initMsgArea');
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
    common.replaceElemClassFromTo('msgFeeArea',         'hidden',    'visibleTC', true).value = 'Fee: ';
    common.replaceElemClassFromTo('attachmentButton',   'hidden',    'visibleIB', false);
    common.replaceElemClassFromTo('attachmentInput',    'visibleIB', 'hidden', true);
    const attachmentSaveA = document.getElementById('attachmentSaveA');
    attachmentSaveA.style.display = 'none';
    attachmentSaveA.href = '';
    attachmentSaveA.download = '';
    //
    const msgRefButton = document.getElementById('msgRefButton');
    msgRefButton.ref = '0';
    const msgTextArea = document.getElementById('msgTextArea');
    msgTextArea.className = (msgTextArea.className).replace('hidden', 'visibleIB');
    msgTextArea.disabled = enable ? false : true;
    msgTextArea.readonly = "";
    msgTextArea.value = 'Subject: ';
    const attachmentButton = document.getElementById('attachmentButton');
    attachmentButton.disabled = enable ? false : true;
    common.setMenuButtonState('sendButton', enable ? 'Enabled' : 'Disabled');
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
    showStatus('loading addresses: ' + index.addrList.length.toString(10));
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
	showStatus('checking address: ' + idx.toString(10) + ' of ' + (index.addrList.length - 1).toString(10));
	const addrInfo = index.addrList[idx];
	fillAddrInfo(addrInfo, () => {
	    setTimeout(fillAddrInfoNext, 500, idx + 1, cb);
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
	    elem.balanceArea.value = ether.convertWeiBNToComfort(addrInfo.balanceBN, 3);
	    if (addrInfo.valid) {
		elem.feeArea.value = 'Fee: ' + ether.convertWeiBNToComfort(addrInfo.feeBN);
		elem.activityArea.value = addrInfo.activity.toString(10) + ' messages sent';
		index.validAddrs.push(addrInfo.idx);
	    } else {
		elem.sendArea.value = 'no -- address is not registered';
	    }
	}
    }
    ether.ensReverseLookup(addrInfo.addr, function(err, name) {
	if (!err && !!name)
	    addrInfo.ensName = name;
	ether.getBalance(addrInfo.addr, 'wei', function(err, balance) {
	    addrInfo.balanceBN = common.numberToBN(balance);
            mtEther.accountQuery(addrInfo.addr, function(err, acctInfo) {
		addrInfo.valid = (!err && acctInfo.isValid) ? true : false;
		if (addrInfo.valid) {
		    addrInfo.activity = acctInfo.sentMsgCount;
		    mtEther.getPeerMessageCount(addrInfo.addr, common.web3.eth.accounts[0], function(err, msgCount) {
			console.log(msgCount.toString(10) + ' messages have been sent from ' + addrInfo.addr + ' to me');
			addrInfo.feeBN = common.numberToBN((msgCount > 0) ? acctInfo.msgFee : acctInfo.spamFee);
			fillFcn(addrInfo);
			cb();
		    });
		} else {
		    fillFcn(addrInfo);
		    cb();
		}
	    });
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
    let div, addrNoArea, addrArea, feeArea, activityArea, sendArea;
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
    balanceArea = document.createElement("textarea");
    balanceArea.className = 'addrListBalanceArea';
    balanceArea.rows = 1;
    balanceArea.readonly = 'readonly';
    balanceArea.disabled = 'disabled';
    balanceArea.value = '';
    activityArea = document.createElement("textarea");
    activityArea.className = 'addrListActivityArea';
    activityArea.rows = 1;
    activityArea.readonly = 'readonly';
    activityArea.disabled = 'disabled';
    activityArea.value = '';
    sendArea = document.createElement("textarea");
    sendArea.className = 'addrListSendArea notBlinking';
    sendArea.rows = 1;
    sendArea.readonly = 'readonly';
    sendArea.disabled = 'disabled';
    sendArea.value = '';
    div.appendChild(addrNoArea);
    div.appendChild(addrArea);
    div.appendChild(validArea);
    div.appendChild(feeArea);
    div.appendChild(balanceArea);
    div.appendChild(activityArea);
    div.appendChild(sendArea);
    const addrElem = new AddrElem(div, addrNoArea, addrArea, validArea, feeArea, balanceArea, activityArea, sendArea, elemIdx);
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


//
// findRecipients(cb)
// find recipients from addrList based on filters
//
function findRecipients(cb) {
    index.recipients = [];
    index.totalFeesBN = new BN(0);
    for (let validIdx = 0; validIdx < index.validAddrs.length; ++validIdx) {
	const idx = index.validAddrs[validIdx];
	const addrInfo = index.addrList[idx];
	showStatus(index.noAddrsMsg + ' | filters set | checking recipients: address: ' + idx.toString(10));
	const elem = index.addrListElems[addrInfo.idx];
	if (!!index.filterFeeBN && addrInfo.feeBN.gt(index.filterFeeBN))
	    elem.sendArea.value = 'no -- fee is too high';
	else if (!!index.filterBalanceBN && addrInfo.balanceBN.lt(index.filterBalanceBN))
	    elem.sendArea.value = 'no -- balance is too low';
	else if (!!index.filterActivity && parseInt(addrInfo.activity) < parseInt(index.filterActivity))
	    elem.sendArea.value = 'no -- insufficient activity';
	else if (!!index.filterRequireENS && !ensName)
	    elem.sendArea.value = 'no -- does not have ENS name';
	else {
	    elem.sendArea.value = 'yes';
	    index.totalFeesBN.iadd(addrInfo.feeBN);
	    index.recipients.push(idx);
	}
    }
    const feeMsg = 'Total Fees: ' + ether.convertWeiBNToComfort(index.totalFeesBN);
    showStatus(index.noAddrsMsg + ' | filters set | ' + index.recipients.length.toString(10) + ' recipients | ' + feeMsg);
    cb();
}


//
// send message to all recipients
// message already includes any attachment
//
function sendRecipients(idx, message, attachmentIdxBN, cb) {
    const totalFeesMsg = 'Total Fees: ' + ether.convertWeiBNToComfort(index.totalFeesBN);
    if (idx >= index.recipients.length) {
	const sentMsg = 'sent to ' + index.recipients.length.toString(10) + ' recipients';
	showStatus(index.noAddrsMsg + ' | filters set | ' + index.recipients.length.toString(10) + ' recipients | ' + totalFeesMsg + ' | ' + sentMsg);
	cb();
	return;
    }
    const recipientIdx = index.recipients[idx];
    const addrInfo = index.addrList[recipientIdx];
    const sendingMsg = 'sending to ' + addrInfo.idx.toString(10);
    showStatus(index.noAddrsMsg + ' | filters set | ' + index.recipients.length.toString(10) + ' recipients | ' + totalFeesMsg + ' | ' + sendingMsg);
    //
    document.getElementById('msgAddrArea').value = addrInfo.addr;
    const elem = index.addrListElems[addrInfo.idx];
    elem.sendArea.value = 'now sending!';
    common.replaceClassFromTo(elem.sendArea, 'notBlinking', 'blinking', true);
    mtUtil.encryptMsg(addrInfo.addr, message, function(err, msgFee, encrypted, msgNoBN) {
	if (!!err) {
	    alert(err);
	    handleUnlockedMetaMask(null);
	    return;
	}
	document.getElementById('msgFeeArea').value = 'Fee: ' + ether.convertWeiBNToComfort(common.numberToBN(msgFee));
	const msgRefButton = document.getElementById('msgRefButton');
	const ref = '0';
	const gasLimit = 0;
	const gasPrice = "20";
	mtEther.sendMessagePK(index.privateKey, addrInfo.addr, attachmentIdxBN, ref, encrypted, msgFee, gasLimit, gasPrice, function(err, txid) {
	    console.log('txid = ' + txid);
	    const cbFcn = (err, receipt) => {
		console.log('waitForTXID cb: err = ' + err + ', receipt = ' + (!!receipt ? JSON.stringify(receipt) : ' null'));
		if (!!err) {
		    elem.sendArea.value = 'send error!';
		} else {
		    mtUtil.acctInfo.sentMsgCount = msgNoBN.toString(10);
		    elem.sendArea.value = 'sent!';
		    common.replaceClassFromTo(elem.sendArea, 'blinking', 'notBlinking', true);
		}
		common.waitingForTxid = false;
		common.clearStatusDiv();
		console.log('waitForTXID cb: mtUtil.acctInfo.sentMsgCount = ' + mtUtil.acctInfo.sentMsgCount);
		sendRecipients(idx + 1, message, attachmentIdxBN, cb);
	    };
	    common.waitForTXID(err, txid, 'Send-Message', null, ether.etherscanioTxStatusHost, cbFcn);
	});
    });
}


function showStatus(statusMsg) {
    document.getElementById('statusLine').value = 'status: ' + statusMsg;
}


function displayFeesAndMsgCnt() {
    const totalReceivedArea = document.getElementById('totalReceivedArea');
    const feeBalanceArea = document.getElementById('feeBalanceArea');
    totalReceivedArea.value = 'Messages sent: ' + mtUtil.acctInfo.sentMsgCount + '; Messages received: ' + mtUtil.acctInfo.recvMsgCount;
    const feebalanceWei = mtUtil.acctInfo.feeBalance;
    feeBalanceArea.value = 'Unclaimed message fees: ' + ether.convertWeiBNToComfort(common.numberToBN(feebalanceWei));
}

//  LocalWords:  const
