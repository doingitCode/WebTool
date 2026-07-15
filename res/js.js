// 复制组件
Vue.directive('copy', {
    bind(e, binding) {
        e.onclick = function () {
            var value = binding.value ? binding.value : this.innerHTML.replace(/&gt;/g, '>')
            navigator.clipboard.writeText(value.trim())
            Vue.prototype.$message({
                message: '已复制：' + value,
                type: 'info',
                duration: 1000
            });
        }
    }
})

// 文本差异对比
Vue.component('diffTool', {
    name: 'diffTool',
    template: `#diffTool`,
    data() {
        return {
            leftContent: '',
            rightContent: '',
            diff: [],
            left: true,
        }
    },
    mounted() {
        this.textAreaInit()
        this.changed()
    },
    methods: {
        changed() {
            function push(ele, value) {
                if (value.indexOf('\n') == -1) {
                    ele.push(value + '\n')
                } else
                    for (var i of value.split('\n').slice(0, -1)) {
                        ele.push(i + '\n')
                    }
            }
            var diff = Diff["diffLines"](this.leftContent + '\n', this.rightContent + '\n');
            // console.log(Diff["convertChangesToXML"](diff))
            var p = 0;
            var left = []
            var right = []
            for (var i = 0; i < diff.length; i++) {
                var lineCount = diff[i].value.split('\n').length - 1;
                if (diff[i].removed) {
                    push(left, diff[i].value)
                    for (p -= lineCount; p > 0; p--) {
                        left.push('')
                    }
                } else if (diff[i].added) {
                    push(right, diff[i].value)
                    for (p += lineCount; p < 0; p++) {
                        right.push('')
                    }
                } else {
                    for (; p > 0; p--) {
                        left.push('')
                    }
                    for (; p < 0; p++) {
                        right.push('')
                    }
                    push(left, diff[i].value)
                    push(right, diff[i].value)
                }
            }
            for (; p > 0; p--) {
                left.push('')
            }
            for (; p < 0; p++) {
                right.push('')
            }
            // console.log(left, right)
            this.diff = []
            for (var i = 0; i < left.length; i++) {
                if (left[i] === right[i]) {
                    this.diff.push([false, left[i]])
                } else {
                    this.diff.push([true, diff = Diff["convertChangesToXML"](Diff["diffChars"](left[i],
                        right[i]))])
                }
            }
        },
        filter(diff, mode) {
            diff = diff.replace(/\n/g, "")
            // console.log(diff)
            if (mode == "ins")
                return diff.replace(/<ins>.*?<\/ins>/g, "").replace(/ /g, '&nbsp;')
            else if (mode == "del") {
                return diff.replace(/<del>.*?<\/del>/g, "").replace(/ /g, '&nbsp;')
            } else {
                return diff.replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/ /g, '&nbsp;')
            }
        },
        textAreaInit() {
            const textarea1 = document.getElementById('diffLeft');
            const textarea2 = document.getElementById('diffRight');
            const resizeBar = document.getElementsByClassName('areaResizeBar')[0];

            let isResizing = false;
            let startY = 0;

            resizeBar.addEventListener('mousedown', function (e) {
                isResizing = true;
                startY = e.clientY;
                document.addEventListener('mousemove', resize);
                document.addEventListener('mouseup', stopResize);
            });

            function resize(e) {
                if (isResizing) {
                    const deltaY = e.clientY - startY;
                    if (textarea1.offsetHeight + deltaY < 550) {
                        textarea1.style.height = `${textarea1.offsetHeight + deltaY}px`;
                        textarea2.style.height = `${textarea2.offsetHeight + deltaY}px`;
                        startY = e.clientY;
                    }
                }
            }

            function stopResize() {
                if (isResizing) {
                    isResizing = false;
                    document.removeEventListener('mousemove', resize);
                    document.removeEventListener('mouseup', stopResize);
                }
            }
        },
        areaScale() {
            const textarea1 = document.getElementById('diffLeft');
            const textarea2 = document.getElementById('diffRight');
            if (textarea1.style.height.replace('px', '.') > 240 || textarea2.style.height.replace('px', '.') > 240) {
                textarea1.style.height = '63px'
                textarea2.style.height = '63px'
            } else {
                textarea1.style.height = '550px'
                textarea2.style.height = '550px'
            }
        },
    },
})

// 文本工具组件
Vue.component('textTool', {
    name: 'textTool',
    template: `#textTool`,
    data() {
        return {
            rows: ['1', '2', '3'],
            tableData: [],
            searchContent: {},
            mergeMode: false,
            repRule: ['', ''],
            textToolReg: true,
            showTextToolInput: true,
            textReplaceMode: 0,
            textTool: ['', ''],
            realRes: [],
            mergeLimit: 20,
            textHistory: [''],
            stackSize: 10,
            historyIndex: 0,
            rulesData: rulesDataJson,
            historyRules: [],
            hisPopVisible: false
        }
    },
    methods: {
        formatLine(mode) {
            if (!this.textTool[0]) return
            console.log(mode)

            if (mode == 'upper') {
                Vue.set(this.textTool, 1, this.textTool[1].toUpperCase())
                return
            }

            if (mode == 'lower') {
                Vue.set(this.textTool, 1, this.textTool[1].toLowerCase())
                return
            }

            var lines = this.textTool[1].split(/\r?\n/g);

            if (mode == 'trim') {
                var resList = lines.map(e => e.trim())
                Vue.set(this.textTool, 1, resList.join('\n'))
                return
            }

            var lineList = []
            for (var l of lines)
                lineList.push(l.match(/[A-Z]+(?![a-z])|[A-Z][a-z0-9]*|[a-z0-9]+/g))

            if (mode == 'chr') {
                if (!this.repRule[1]) {
                    this.$message({
                        message: '分隔符默认为 _ ,请在替换文本处输入分隔符号↘',
                        type: 'warning'
                    })
                    this.repRule[1] = '_'
                }

                var resList = lineList.map(e => e ? e.join(this.repRule[1]) : "")
                Vue.set(this.textTool, 1, resList.join('\n'))
                return
            }

            if (mode == 'Camel' || mode == 'camel') {
                var upperWord = e => e.trim().replace(/^./, (match) => match.toUpperCase())
                var resList = []
                for (var i of lineList) {
                    if (i == null) {
                        resList.push('')
                        continue
                    }
                    var firstWord = mode == 'Camel' ? upperWord(i[0]) : i[0].toLowerCase();
                    var otherWord = i.slice(1).map(e => upperWord(e))
                    resList.push(firstWord + otherWord.join(''))
                }
                Vue.set(this.textTool, 1, resList.join('\n'))
                return
            }
        },
        // 文本处理工具
        textReplace() {
            try {
                if (this.repRule[0] == '') {
                    this.textTool[1] = this.textReplaceMode ? '' : this.textTool[0]
                    return
                }
                var rule = this.repRule[0]
                var res = ''
                var lines = this.textTool[0].split(/\r?\n/g);
                switch (this.textReplaceMode) {
                    case 0:
                        if (this.textToolReg)
                            res = this.textTool[0].replace(new RegExp(rule, 'g'), this.repRule[1]
                                .replace(/(\\n)|(\\r)/g, '\n').replace('\\t', '\t'))
                        else
                        if (!this.textToolReg)
                            res = this.textTool[0].replace(new RegExp(rule.replace(
                                /[.*+\-?^${}()|[\]\\]/g, '\\$&'), 'g'), this.repRule[1])
                        break
                    case 1:
                        for (var l of lines) {
                            if (this.textToolReg) {
                                var matches = new RegExp(rule).exec(l)
                                if (matches)
                                    res += matches.slice(-1)
                            } else
                                res += l.indexOf(rule) != -1 ? rule : ''
                            res += '\n'
                        }
                        break
                    case 2:
                        for (var l of lines)
                            if ((this.textToolReg && new RegExp(rule).test(l)) || (!this.textToolReg &&
                                    l.indexOf(rule) != -1))
                                res += l + '\n'
                        break
                }
                Vue.set(this.textTool, 1, res)
            } catch (e) {
                console.log(e)
                Vue.set(this.textTool, 1, '-- err --')
            }
        },
        // 格式化XML
        formatXML() {
            function setPrefix(prefixIndex) {
                var result = '';
                var span = '    '; //缩进长度
                var output = [];
                for (var i = 0; i < prefixIndex; ++i) {
                    output.push(span);
                }
                result = output.join('');
                return result;
            }
            text = this.textTool[0]
            //使用replace去空格
            text = '\n' + text.replace(/(<\w+)(\s.*?>)/g, function ($0, name, props) {
                return name + ' ' + props.replace(/\s+(\w+=)/g, " $1");
            }).replace(/>\s*?</g, ">\n<");
            //处理注释
            text = text.replace(/\n/g, '\r').replace(/<!--(.+?)-->/g, function ($0, text) {
                var ret = '<!--' + escape(text) + '-->';
                return ret;
            }).replace(/\r/g, '\n');
            //调整格式	以压栈方式递归调整缩进
            var rgx = /\n(<(([^\?]).+?)(?:\s|\s*?>|\s*?(\/)>)(?:.*?(?:(?:(\/)>)|(?:<(\/)\2>)))?)/mg;
            var nodeStack = [];
            var output = text.replace(rgx, function ($0, all, name, isBegin, isCloseFull1, isCloseFull2,
                isFull1, isFull2) {
                var isClosed = (isCloseFull1 == '/') || (isCloseFull2 == '/') || (isFull1 ==
                    '/') || (isFull2 == '/');
                var prefix = '';
                if (isBegin == '!') { //!开头
                    prefix = setPrefix(nodeStack.length);
                } else {
                    if (isBegin != '/') { ///开头
                        prefix = setPrefix(nodeStack.length);
                        if (!isClosed) { //非关闭标签
                            nodeStack.push(name);
                        }
                    } else {
                        nodeStack.pop(); //弹栈
                        prefix = setPrefix(nodeStack.length);
                    }
                }
                var ret = '\n' + prefix + all;
                return ret;
            });
            var prefixSpace = -1;
            var outputText = output.substring(1);
            //还原注释内容
            outputText = outputText.replace(/\n/g, '\r').replace(/(\s*)<!--(.+?)-->/g, function ($0,
                prefix, text) {
                if (prefix.charAt(0) == '\r')
                    prefix = prefix.substring(1);
                text = unescape(text).replace(/\r/g, '\n');
                var ret = '\n' + prefix + '<!--' + text.replace(/^\s*/mg, prefix) + '-->';
                return ret;
            });
            outputText = outputText.replace(/\s+$/g, '').replace(/\r/g, '\r\n');
            Vue.set(this.textTool, 1, outputText)
        },
        // 格式化JSON
        formatJSON() {
            try {
                // 截取头尾
                var str = this.textTool[0]
                if (!str)
                    return
                var headI = str.indexOf('{')
                var footI = str.lastIndexOf('}')
                var head = ''
                var foot = ''

                if (headI > 0)
                    head = str.substring(0, headI)
                if (footI != -1 && footI != str.length)
                    foot = str.substring(footI + 1)
                str = str.substring(headI, str.length - foot.length)

                // 格式化
                try {
                    str = JSON.stringify(JSON.parse(str), null, 2);
                } catch (e) {
                    str = str.replace(/([^\\\\,{}\"\[]+):/g, "\"$1\":") // 加双引号
                    console.log(str)
                    try {
                        str = JSON.stringify(JSON.parse(str), null, 2);
                    } catch (e) {
                        str = str.replace(/\[/g, "{").replace(/\]/g, '}') // 中括号转大括号
                        console.log(str)
                        str = JSON.stringify(JSON.parse(str), null, 2);
                    }
                }

                //补充头尾
                if (head)
                    str = head + '\n\n' + str
                if (foot)
                    str = str + '\n' + foot
                Vue.set(this.textTool, 1, str)
            } catch (e) {
                Vue.set(this.textTool, 1, '-- err --')
                console.log(e)
            }
        },
        addRow() {
            var last = this.rows.slice(-1)
            if (last.length)
                this.rows.push(parseInt(last) + 1 + '')
            else
                this.rows.push('1')
        },
        delRow(r) {
            this.rows.splice(this.rows.indexOf(r), 1)
            delete this.searchContent[r]
            this.calContent()
        },
        calContent() {
            res = []
            var slist = {}
            var maxlen = 0

            for (let i in this.searchContent) {
                var l = this.searchContent[i].split('\n')
                if (l.slice(-1) == '')
                    l = l.slice(0, -1)
                if (l.length > maxlen)
                    maxlen = l.length
                maxIndex = i
                slist[i] = l
            }

            for (let i = 0; i < maxlen; i++) {
                res[i] = {}
                for (let ele in slist) {
                    if (slist[ele].length == 1)
                        res[i][ele] = slist[ele][0];
                    else if (slist[ele].length > i)
                        res[i][ele] = slist[ele][i];
                }
            }
            this.realRes = res
            if (res.length > this.mergeLimit) {
                this.tableData = res.slice(0, this.mergeLimit)
                var key = Object.keys(this.tableData[0])[0]
                var last = {}
                last[key] = "......"
                this.tableData.push(last)
            } else {
                this.tableData = res
            }
            this.calResult()
        },
        calResult() {
            for (let ele of this.realRes) {
                var res = ''
                for (let i in ele)
                    if (i != 'res')
                        res += ele[i]
                ele['res'] = res
            }
        },
        copyTableResult() {
            var res = ''
            for (let ele of this.realRes)
                res += ele['res'] + '\n'
            navigator.clipboard.writeText(res)
            Vue.prototype.$message({
                message: '已复制合并值',
                type: 'info',
                duration: 1000
            });
        },
        clearTable() {
            this.rows = ['1', '2']
            this.tableData = []
            this.searchContent = {}
        },
        // 响应式设参
        setToolText(value) {
            this.pushRuleHistory()
            this.handelHistory('push', value)
            Vue.set(this.textTool, 0, value)
            this.textReplace()
        },
        handelHistory(mode, value) {
            var his = this.textHistory
            var idx = this.historyIndex
            switch (mode) {
                case 'next':
                    if (idx + 2 > his.length) return
                    idx++;
                    Vue.set(this.textTool, 0, his[idx])
                    this.textReplace()
                    break;
                case 'prev':
                    if (idx - 1 < 0) return
                    idx--;
                    Vue.set(this.textTool, 0, his[idx])
                    this.textReplace()
                    break;
                case 'push':
                    his = his.slice(0, idx + 1)
                    if (his.slice(-1) == value) break;
                    if (his[0] == '' && idx == 0)
                        his.push(this.textTool[0])
                    his.push(value)
                    if (his.length > this.stackSize)
                        his = his.slice(1)
                    idx = his.length - 1
                    break;
            }
            this.historyIndex = idx
            this.textHistory = his

            console.log(this.textHistory.map(e => e.length > 20 ? e.slice(0, 20) + '...' : e))
            console.log(this.historyIndex)
        },
        // 置入粘贴板
        copy(value, history) {
            if (history !== true)
                this.pushRuleHistory()
            if (!value)
                return
            navigator.clipboard.writeText(value)
            Vue.prototype.$message({
                message: 'copy',
                type: 'info',
                duration: 1000
            });
        },
        spanMethod({
            row,
            column,
            rowIndex,
            columnIndex
        }) {
            if (columnIndex == 0 && rowIndex == this.tableData.length - 1 && this.realRes.length > this.mergeLimit) {
                return {
                    rowspan: 1,
                    colspan: this.$refs.mergeTable.columns.length - 1,
                };
            } else {
                return {
                    rowspan: 1,
                    colspan: 1
                };
            }
        },
        reset() {
            Vue.set(this.textTool, 1, this.textTool[0])
        },
        loadRule(row, column, event) {
            console.log(row)
            this.repRule = [row['rule'], row['replace']]
            this.textReplaceMode = row['mode']
            this.textReplace()
            this.hisPopVisible = false
        },
        saveRule(idx, e) {
            console.log(idx)
            e.stopPropagation()
            var r = this.historyRules[idx]
            this.copy(JSON.stringify({
                desc: "",
                rule: r['rule'],
                replace: r['replace'],
                mode: this.textReplaceMode
            }) + ',', true)
            this.hisPopVisible = false
        },
        pushRuleHistory() {
            if (this.repRule[0] != '' &&
                (this.historyRules.length == 0 ||
                    this.historyRules[0]['rule'] != this.repRule[0] ||
                    this.historyRules[0]['replace'] != this.repRule[1]))
                this.historyRules.unshift({
                    rule: this.repRule[0],
                    replace: this.repRule[1],
                    mode: this.textReplaceMode
                })
        }
    },
    watch: {
        textToolReg(val) {
            this.textReplace()
        },
        textReplaceMode(val) {
            this.textReplace()
        },
        searchContent: {
            handler(newVal, oldVal) {
                this.calContent()
            },
            deep: true
        }
    }
})

var actions = []
var users = []
// 主页面
var app = new Vue({
    el: '#app',
    data() {
        return {
            menus: [],
            diclist: [],
            treediclist: [],
            filterText: '',
            selectUser: '',
            selectOrg: '',
            selectColumn: '',
            selectDic: '',
            selectDicValue: '',
            selectTreeDicType: '',
            selectTreeDicValue: '',
            showTree: false,
            showTreeDic: false,

            loadingText: '',
            inputPanel: ['', '', '', ''],
            showInputPanel: '2',
            copyData: copyDataJson,
        }
    },
    mounted() {
        // 页面统一加载（待优化）
        document.getElementById('app').style.opacity = 1
    },
    methods: {
        // 动态加载json
        loadJs(src, cb) {
            var script = document.createElement('script')
            var head = document.getElementsByTagName('head')[0]

            script.type = 'text/javascript'
            script.src = src
            if (script.addEventListener) {
                script.addEventListener('load', function () {
                    cb()
                }, false)
            } else if (script.attachEvent) {
                script.attachEvent('onreadystatechange', function () {
                    var target = window.event.srcTarget
                    if (target.readyState == 'loaded') {
                        cb();
                    }
                })
            }
            head.appendChild(script)
        },


        // 查询字典类型
        searchDicType(query, cb) {
            var result = []
            if (query.length < 1) {
                cb([])
                return
            }
            query = query.toUpperCase().replace(/_/g, '')
            var ul = this.diclist
            for (let d in ul) {
                var item = ul[d]
                var str = d.replace(/_/g, '') + item['memo']
                if (str.indexOf(query) != -1)
                    result.push({
                        "value": d,
                        "memo": item['memo']
                    })
            }
            cb(result)
        },
        // 查询字典码值
        searchDicValue(query, cb) {
            var result = []
            var dl = this.diclist[this.selectDic]
            if (!dl) {
                dl = []
                if (query.length < 1) {
                    cb([])
                    return
                }
                for (let k in this.diclist) {
                    let oneType = this.diclist[k]
                    for (let d in oneType['child']) {
                        let item = oneType['child'][d]
                        let str = d + item
                        if (str.indexOf(query) != -1)
                            result.push({
                                'memo': oneType['memo'],
                                'type': k,
                                'ename': d,
                                'cname': item
                            })
                    }
                }
            } else {
                for (let d in dl['child']) {
                    let item = dl['child'][d]
                    let str = d + item
                    if (str.indexOf(query) != -1)
                        result.push({
                            'memo': dl['memo'],
                            'type': this.selectDic,
                            'ename': d,
                            'cname': item
                        })
                }
            }
            cb(result)
        },


        // 阻止冒泡
        preventEvent(e) {
            e.stopPropagation()
        },

        // 滚动顶部
        scrollTop() {
            window.location.href = '#app'
        },
        // 过滤器
        filterNode(value, data) {
            if (!value) return true;
            var l = data.label.split(' - ')
            value = value.toUpperCase()
            ename = l.slice(-1)[0].toUpperCase()
            cname = l[0].toUpperCase()
            return (value.length < 3 ? ename == value : ename.indexOf(value) != -1) || (value.length < 2 ? cname == value : cname.indexOf(value) != -1)
        },

        // 加载字典数据
        loadDicJson() {
            if (this.diclist.length == 0) {
                var that = this
                that.loadingText = '字典加载中'
                that.loadJs('res/json/dic.js', function () {
                    that.diclist = dicJson
                    that.loadingText = ''
                })
            }
        },
    },
    watch: {
        showTreeDic(val) {
            if (!val)
                this.filterText = ''
            else if (val && this.treediclist == 0) {
                var that = this
                that.loadingText = '树形字典加载中'
                that.loadJs('res/json/treedic.js', function () {
                    that.treediclist = treedicJson
                    that.loadingText = ''
                })
            }
        },
        showTree(val) {
            // 动态加载菜单
            if (val && this.menus.length == 0) {
                this.loadingText = '菜单树加载中'
                var that = this
                that.loadJs('res/json/users.js', function () {
                    users = usersJson
                    that.loadJs('res/json/action.js', function () {
                        actions = actionsJson
                        that.loadJs('res/json/menu.js', function () {
                            that.menus = menuJson
                            that.loadingText = ''
                        })
                    })
                })
            }
        },
        filterText(val) {
            this.$refs.tree.filter(val)
            if (!val)
                this.$refs.tree.store._getAllNodes().forEach(v => v.expanded = false)
        },
    },
})